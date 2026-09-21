import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { createHash } from 'node:crypto';
import { fail, must } from '../domain/errors';
import { newId } from '../domain/ids';
import { fulfillmentTransition, orderTransition } from '../domain/machines';
import { lineMoney, linePhysicalWeight, type FormulaType } from '../domain/money';
import { MemoryPlatform } from '../infra/memory.platform';
import type { Fulfillment, TxCtx } from '../infra/types';

const WEIGHT_THRESHOLD = new Decimal('0.02');

@Injectable()
export class ReceivingService {
  constructor(private readonly db: MemoryPlatform) {}

  createFulfillment(ctx: TxCtx, orderId: string, input: { expectedQty: string; appointmentId?: string }) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'fulfillments.weigh');
      const order = this.db.requireOrderAccess(ctx, orderId);
      if (order.status === 'cancelled' || order.status === 'completed') {
        fail('INVALID_STATE_TRANSITION', 'Đơn không còn nhận hàng.');
      }
      const qty = new Decimal(input.expectedQty);
      if (!qty.gt(0)) fail('VALIDATION_FAILED', 'Khối lượng phải lớn hơn 0.');
      const seq = [...this.db.fulfillments.values()].filter((f) => f.orderId === orderId).length + 1;
      const row: Fulfillment = {
        id: newId(),
        orderId,
        appointmentId: input.appointmentId ?? null,
        sequence: seq,
        expectedQty: qty.toFixed(3),
        status: 'expected',
        version: 1,
      };
      this.db.fulfillments.set(row.id, row);
      if (order.status === 'confirmed') {
        orderTransition(order.status, 'in_fulfillment');
        order.status = 'in_fulfillment';
        order.version += 1;
      }
      return row;
    });
  }

  weigh(
    ctx: TxCtx,
    fulfillmentId: string,
    input: {
      grossWeight: string;
      tareWeight?: string;
      formulaType?: FormulaType;
      qualityPercent?: string;
      lossPercent?: string;
    },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'fulfillments.weigh');
      const f = this.mustFulfillment(ctx, fulfillmentId);
      fulfillmentTransition(f.status, 'weighed');
      const formulaType = input.formulaType ?? 'standard';
      const formulaInputs = {
        grossWeight: input.grossWeight,
        tareWeight: input.tareWeight ?? '0',
        qualityPercent: input.qualityPercent ?? '0',
        lossPercent: input.lossPercent ?? '0',
      };
      const money = lineMoney({
        formulaType,
        ...formulaInputs,
        unitPrice: '0',
      });
      const physical = linePhysicalWeight({ grossWeight: input.grossWeight });
      const expected = new Decimal(f.expectedQty);
      if (expected.gt(0)) {
        const drift = physical.minus(expected).abs().div(expected);
        if (drift.gt(WEIGHT_THRESHOLD)) {
          fail('VALIDATION_FAILED', 'Sai số cân vượt 2%. Cần lý do over_accept (chưa gửi).', {
            fieldErrors: [{ field: 'grossWeight', code: 'threshold', message: 'Sai số cân vượt ngưỡng.' }],
          });
        }
      }
      const rec = {
        id: newId(),
        fulfillmentId,
        grossWeight: input.grossWeight,
        tareWeight: input.tareWeight ?? '0',
        formulaType,
        formulaInputs,
        physicalQty: physical.toFixed(3),
        payableQty: money.netWeight.toFixed(3),
      };
      this.db.weighings.set(rec.id, rec);
      f.status = 'weighed';
      f.version += 1;
      return { fulfillment: f, weighing: rec };
    });
  }

  qualityCheck(ctx: TxCtx, fulfillmentId: string, input: { reason?: string }) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'fulfillments.weigh');
      const f = this.mustFulfillment(ctx, fulfillmentId);
      fulfillmentTransition(f.status, 'qc');
      f.status = 'qc';
      f.version += 1;
      return { fulfillment: f, reason: input.reason ?? null };
    });
  }

  accept(
    ctx: TxCtx,
    fulfillmentId: string,
    input: { qtyAccepted: string; qtyRejected?: string; operationId?: string },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'fulfillments.accept');
      const run = () => this.acceptInner(ctx, fulfillmentId, input);
      if (input.operationId && ctx.workspaceId) {
        return this.db.rememberOperation(input.operationId, ctx.workspaceId, 'fulfillment.accept', run);
      }
      return run();
    });
  }

  reject(ctx: TxCtx, fulfillmentId: string, reason: string) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'fulfillments.accept');
      const f = this.mustFulfillment(ctx, fulfillmentId);
      fulfillmentTransition(f.status, 'rejected');
      f.status = 'rejected';
      f.version += 1;
      const rejectionId = newId();
      this.db.acceptances.set(rejectionId, {
        id: rejectionId,
        fulfillmentId,
        qtyAccepted: '0.000',
        qtyRejected: f.expectedQty,
        posted: false,
      });
      void reason;
      return f;
    });
  }

  private acceptInner(
    ctx: TxCtx,
    fulfillmentId: string,
    input: { qtyAccepted: string; qtyRejected?: string },
  ) {
    const f = this.mustFulfillment(ctx, fulfillmentId);
    const qtyAccepted = new Decimal(input.qtyAccepted);
    const qtyRejected = new Decimal(input.qtyRejected ?? 0);
    if (qtyAccepted.lt(0) || qtyRejected.lt(0)) fail('VALIDATION_FAILED', 'Khối lượng không hợp lệ.');
    const to: Fulfillment['status'] = qtyRejected.gt(0) ? 'partially_accepted' : 'accepted';
    fulfillmentTransition(f.status, to);
    const weigh = [...this.db.weighings.values()].filter((w) => w.fulfillmentId === fulfillmentId).at(-1);
    if (!weigh) fail('INVALID_STATE_TRANSITION', 'Chưa có phiếu cân.');

    const acc = {
      id: newId(),
      fulfillmentId,
      qtyAccepted: qtyAccepted.toFixed(3),
      qtyRejected: qtyRejected.toFixed(3),
      posted: true,
    };
    this.db.acceptances.set(acc.id, acc);
    f.status = to;
    f.version += 1;

    const order = must(this.db.orders.get(f.orderId), 'Thiếu đơn.', 'VALIDATION_FAILED');
    const seller = this.db.participants.find((p) => p.orderId === order.id && p.side === 'seller');
    const buyer = this.db.participants.find((p) => p.orderId === order.id && p.side === 'buyer');

    const res = [...this.db.reservations.values()].find((r) => r.orderId === order.id && r.status === 'active');
    if (res?.harvestLotId) {
      const lot = this.db.lots.get(res.harvestLotId);
      if (lot) {
        lot.reservedQty = new Decimal(lot.reservedQty).minus(qtyAccepted).toFixed(3);
        lot.deliveredQty = new Decimal(lot.deliveredQty).plus(qtyAccepted).toFixed(3);
        if (new Decimal(lot.reservedQty).lt(0)) fail('INSUFFICIENT_STOCK', 'Giữ chỗ không khớp.');
      }
    }

    if (buyer) {
      let wh = [...this.db.warehouses.values()].find((w) => w.workspaceId === buyer.workspaceId);
      if (!wh) {
        wh = { id: newId(), workspaceId: buyer.workspaceId, locationId: null, name: 'Kho mặc định' };
        this.db.warehouses.set(wh.id, wh);
      }
      const inv = {
        id: newId(),
        warehouseId: wh.id,
        workspaceId: buyer.workspaceId,
        commodityId: [...this.db.orderLines.values()].find((l) => l.orderId === order.id)?.commodityId ?? newId(),
        qtyOnHand: qtyAccepted.toFixed(3),
        qtyReserved: '0.000',
        origin: 'purchase' as const,
        version: 1,
      };
      this.db.inventoryLots.set(inv.id, inv);
      this.db.movements.push({
        lotId: inv.id,
        qty: qtyAccepted.toFixed(3),
        reason: 'receive',
        fulfillmentId,
      });
    }

    if (res) res.status = 'consumed';

    const line = [...this.db.orderLines.values()].find((l) => l.orderId === order.id);
    const amount = line
      ? lineMoney({
          formulaType: line.formulaType,
          grossWeight: qtyAccepted.toFixed(3),
          ...line.formulaInputs,
          unitPrice: line.unitPrice,
        }).total
      : new Decimal(0);

    if (seller && amount.gt(0)) {
      const entry = {
        id: newId(),
        workspaceId: seller.workspaceId,
        partyId: buyer?.partyId ?? null,
        side: 'receivable' as const,
        amount: amount.toFixed(0),
        source: 'trade_order' as const,
        sourceId: order.id,
        dueDate: null,
        status: 'open' as const,
      };
      this.db.rpEntries.set(entry.id, entry);
    }
    if (buyer && amount.gt(0)) {
      const entry = {
        id: newId(),
        workspaceId: buyer.workspaceId,
        partyId: seller?.partyId ?? null,
        side: 'payable' as const,
        amount: amount.toFixed(0),
        source: 'trade_order' as const,
        sourceId: order.id,
        dueDate: null,
        status: 'open' as const,
      };
      this.db.rpEntries.set(entry.id, entry);
    }

    this.db.appendOutbox('goods.accepted', { fulfillmentId, orderId: order.id });
    this.db.appendFeed(ctx, buyer?.workspaceId ?? (ctx.workspaceId as string), 'inventory', fulfillmentId, 'upsert', {});
    this.db.auditEvent(ctx, 'fulfillment.accept', 'fulfillment', fulfillmentId);
    void createHash;
    return { fulfillment: f, acceptance: acc };
  }

  private mustFulfillment(ctx: TxCtx, id: string): Fulfillment {
    const f = must(this.db.fulfillments.get(id));
    this.db.requireOrderAccess(ctx, f.orderId);
    return f;
  }
}
