import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { createHash } from 'node:crypto';
import { fail, must } from '../domain/errors';
import { newId } from '../domain/ids';
import { canAcceptQuote } from '../domain/machines';
import { lineMoney, type FormulaType } from '../domain/money';
import { MemoryPlatform } from '../infra/memory.platform';
import type { QuoteLine, QuoteRevision, Quotation, TradeOrder, TxCtx } from '../infra/types';

@Injectable()
export class QuotationsService {
  constructor(private readonly db: MemoryPlatform) {}

  create(
    ctx: TxCtx,
    input: {
      listingId?: string;
      buyRequestId?: string;
      toWorkspaceId: string;
      lines: Array<{
        commodityId: string;
        qty: string;
        unitPrice: string;
        formulaType?: FormulaType;
        formulaInputs?: Record<string, string>;
      }>;
      expiresAt?: string;
    },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'quotations.send');
      const from = this.db.partyByWorkspace(ctx.workspaceId as string);
      const to = this.db.partyByWorkspace(input.toWorkspaceId);
      if (from.id === to.id) fail('VALIDATION_FAILED', 'Không tự báo giá cho mình.');
      const quotation: Quotation = {
        id: newId(),
        listingId: input.listingId ?? null,
        buyRequestId: input.buyRequestId ?? null,
        fromPartyId: from.id,
        toPartyId: to.id,
        currentRevisionId: null,
        version: 1,
      };
      const revision = this.addRevision(ctx, quotation, 'draft', input.lines, input.expiresAt ?? null);
      quotation.currentRevisionId = revision.id;
      this.db.quotations.set(quotation.id, quotation);
      return { quotation, revision };
    });
  }

  send(ctx: TxCtx, id: string) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'quotations.send');
      const q = this.mustQuote(ctx, id);
      const rev = must(
        q.currentRevisionId ? this.db.revisions.get(q.currentRevisionId) : undefined,
        'Chỉ gửi bản nháp.',
        'INVALID_STATE_TRANSITION',
      );
      if (rev.status !== 'draft') fail('INVALID_STATE_TRANSITION', 'Chỉ gửi bản nháp.');
      rev.status = 'sent';
      this.db.appendOutbox('quotation.sent', { quotationId: id, revisionId: rev.id });
      return { quotation: q, revision: rev };
    });
  }

  counter(
    ctx: TxCtx,
    id: string,
    input: {
      expectedVersion: number;
      lines: Array<{
        commodityId: string;
        qty: string;
        unitPrice: string;
        formulaType?: FormulaType;
        formulaInputs?: Record<string, string>;
      }>;
      expiresAt?: string;
    },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'quotations.send');
      const q = this.mustQuote(ctx, id);
      if (q.version !== input.expectedVersion) fail('VERSION_CONFLICT', 'Báo giá đã đổi.');
      const cur = must(
        q.currentRevisionId ? this.db.revisions.get(q.currentRevisionId) : undefined,
        'Không counter được báo giá này.',
        'INVALID_STATE_TRANSITION',
      );
      if (cur.status !== 'sent' && cur.status !== 'countered') {
        fail('INVALID_STATE_TRANSITION', 'Không counter được báo giá này.');
      }
      const rev = this.addRevision(ctx, q, 'countered', input.lines, input.expiresAt ?? cur.expiresAt);
      q.currentRevisionId = rev.id;
      q.version += 1;
      this.db.appendOutbox('quotation.countered', { quotationId: id, revisionId: rev.id });
      return { quotation: q, revision: rev };
    });
  }

  accept(
    ctx: TxCtx,
    id: string,
    input: { revisionId: string; expectedVersion: number; operationId?: string; idempotencyKey?: string },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'quotations.accept');
      const hash = createHash('sha256')
        .update(JSON.stringify({ id, revisionId: input.revisionId, expectedVersion: input.expectedVersion }))
        .digest('hex');
      const run = () => this.acceptInner(ctx, id, input);
      if (input.operationId && ctx.workspaceId) {
        return this.db.rememberOperation(input.operationId, ctx.workspaceId, 'quotation.accept', run);
      }
      return this.db.rememberIdempotency(ctx, 'quotation.accept', input.idempotencyKey, hash, run);
    });
  }

  rejectOrWithdraw(ctx: TxCtx, id: string, action: 'rejected' | 'withdrawn') {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, action === 'withdrawn' ? 'quotations.send' : 'quotations.accept');
      const q = this.mustQuote(ctx, id);
      const rev = must(
        q.currentRevisionId ? this.db.revisions.get(q.currentRevisionId) : undefined,
        'Không có revision.',
        'INVALID_STATE_TRANSITION',
      );
      if (rev.status !== 'sent' && rev.status !== 'countered') {
        fail('INVALID_STATE_TRANSITION', 'Không hủy/từ chối được.');
      }
      rev.status = action;
      q.version += 1;
      return { quotation: q, revision: rev };
    });
  }

  private acceptInner(
    ctx: TxCtx,
    id: string,
    input: { revisionId: string; expectedVersion: number },
  ) {
    const q = this.mustQuote(ctx, id);
    if (q.version !== input.expectedVersion) fail('VERSION_CONFLICT', 'Báo giá đã đổi.');
    if (q.currentRevisionId !== input.revisionId) fail('VERSION_CONFLICT', 'Sai phiên bản báo giá.');
    const rev = must(this.db.revisions.get(input.revisionId), 'Sai phiên bản báo giá.', 'VERSION_CONFLICT');
    canAcceptQuote(rev.status, rev.expiresAt, this.db.now());

    const toParty = must(this.db.parties.get(q.toPartyId), 'Thiếu bên giao dịch.', 'VALIDATION_FAILED');
    const fromParty = must(this.db.parties.get(q.fromPartyId), 'Thiếu bên giao dịch.', 'VALIDATION_FAILED');
    const actorParty = this.db.partyByWorkspace(ctx.workspaceId as string);
    if (actorParty.id !== toParty.id && actorParty.id !== fromParty.id) {
      fail('PERMISSION_DENIED', 'Không phải bên nhận báo giá.');
    }

    const lines = [...this.db.quoteLines.values()].filter((l) => l.revisionId === rev.id);
    if (lines.length === 0) fail('VALIDATION_FAILED', 'Báo giá không có dòng.');

    let listing = q.listingId ? this.db.listings.get(q.listingId) : undefined;
    let lot = listing?.harvestLotId ? this.db.lots.get(listing.harvestLotId) : undefined;
    const qty = lines.reduce((s, l) => s.plus(l.qty), new Decimal(0));

    if (lot) {
      const avail = new Decimal(lot.harvestedQty).minus(lot.reservedQty).minus(lot.deliveredQty);
      if (avail.lt(qty)) fail('INSUFFICIENT_STOCK', 'Lô không đủ hàng để giữ chỗ.');
      lot.reservedQty = new Decimal(lot.reservedQty).plus(qty).toFixed(3);
      lot.version += 1;
    }

    const listingSeller = listing ? this.db.partyByWorkspace(listing.workspaceId) : null;
    const buyReq = q.buyRequestId ? this.db.buyRequests.get(q.buyRequestId) : undefined;
    const requestBuyer = buyReq ? this.db.partyByWorkspace(buyReq.workspaceId) : null;
    const sellerParty = must(
      listingSeller ?? (requestBuyer && requestBuyer.id === fromParty.id ? toParty : fromParty),
      'Thiếu bên bán.',
      'VALIDATION_FAILED',
    );
    const buyerParty = sellerParty.id === fromParty.id ? toParty : fromParty;

    const orderId = newId();
    const year = this.db.now().getUTCFullYear();
    const order: TradeOrder = {
      id: orderId,
      status: 'confirmed',
      sourceRevisionId: rev.id,
      buyerPartyId: buyerParty.id,
      sellerPartyId: sellerParty.id,
      issuerWorkspaceId: ctx.workspaceId as string,
      documentNo: this.db.nextDocumentNo(ctx.workspaceId as string, 'so', year),
      version: 1,
      termsSnapshot: { quotationId: q.id, revisionId: rev.id },
    };
    this.db.orders.set(order.id, order);
    this.db.participants.push(
      { orderId, partyId: buyerParty.id, workspaceId: buyerParty.workspaceId, side: 'buyer' },
      { orderId, partyId: sellerParty.id, workspaceId: sellerParty.workspaceId, side: 'seller' },
    );
    this.db.orderViews.push(
      { workspaceId: buyerParty.workspaceId, orderId, direction: 'inbound' },
      { workspaceId: sellerParty.workspaceId, orderId, direction: 'outbound' },
    );
    for (const line of lines) {
      const money = lineMoney({
        formulaType: line.formulaType,
        grossWeight: line.formulaInputs.grossWeight ?? line.qty,
        tareWeight: line.formulaInputs.tareWeight,
        qualityPercent: line.formulaInputs.qualityPercent,
        lossPercent: line.formulaInputs.lossPercent,
        unitPrice: line.unitPrice,
      });
      const orderLineId = newId();
      this.db.orderLines.set(orderLineId, {
        id: orderLineId,
        orderId,
        commodityId: line.commodityId,
        qty: line.qty,
        unit: line.unit,
        unitPrice: line.unitPrice,
        formulaType: line.formulaType,
        formulaInputs: line.formulaInputs,
        lineTotal: money.total.toFixed(0),
      });
    }

    const reservation = {
      id: newId(),
      harvestLotId: lot?.id ?? null,
      lotId: null as string | null,
      workspaceId: sellerParty.workspaceId,
      orderId,
      qty: qty.toFixed(3),
      status: 'active' as const,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };
    this.db.reservations.set(reservation.id, reservation);

    rev.status = 'accepted';
    q.version += 1;
    if (listing && listing.status === 'published') {
      listing.status = 'fulfilled';
      listing.version += 1;
    }

    this.db.appendOutbox('quotation.accepted', { quotationId: q.id, orderId });
    this.db.appendFeed(ctx, buyerParty.workspaceId, 'order', orderId, 'upsert', { status: order.status });
    this.db.appendFeed(ctx, sellerParty.workspaceId, 'order', orderId, 'upsert', { status: order.status });
    this.db.auditEvent(ctx, 'quotation.accept', 'trade_order', orderId);

    return {
      orderId,
      status: order.status,
      version: order.version,
      reservation: { id: reservation.id, qty: reservation.qty, expiresAt: reservation.expiresAt },
    };
  }

  private addRevision(
    ctx: TxCtx,
    q: Quotation,
    status: QuoteRevision['status'],
    lines: Array<{
      commodityId: string;
      qty: string;
      unitPrice: string;
      formulaType?: FormulaType;
      formulaInputs?: Record<string, string>;
    }>,
    expiresAt: string | null,
  ): QuoteRevision {
    const no = [...this.db.revisions.values()].filter((r) => r.quotationId === q.id).length + 1;
    const revision: QuoteRevision = {
      id: newId(),
      quotationId: q.id,
      revisionNo: no,
      status,
      expiresAt,
    };
    this.db.revisions.set(revision.id, revision);
    for (const line of lines) {
      const qty = new Decimal(line.qty);
      const price = new Decimal(line.unitPrice);
      if (!qty.gt(0) || price.isNegative()) fail('VALIDATION_FAILED', 'Dòng báo giá không hợp lệ.');
      const row: QuoteLine = {
        id: newId(),
        revisionId: revision.id,
        commodityId: line.commodityId,
        qty: qty.toFixed(3),
        unit: 'kg',
        unitPrice: price.toFixed(2),
        formulaType: line.formulaType ?? 'standard',
        formulaInputs: line.formulaInputs ?? { grossWeight: qty.toFixed(3) },
      };
      this.db.quoteLines.set(row.id, row);
    }
    return revision;
  }

  private mustQuote(ctx: TxCtx, id: string): Quotation {
    const q = must(this.db.quotations.get(id));
    const from = this.db.parties.get(q.fromPartyId);
    const to = this.db.parties.get(q.toPartyId);
    if (from?.workspaceId !== ctx.workspaceId && to?.workspaceId !== ctx.workspaceId) {
      fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    }
    return q;
  }
}
