import { Injectable } from '@nestjs/common';
import { fail, must } from '../domain/errors';
import { newId } from '../domain/ids';
import { appointmentTransition, orderTransition } from '../domain/machines';
import { MemoryPlatform } from '../infra/memory.platform';
import type { Appointment, TxCtx } from '../infra/types';

const SHARED_ORDER_FIELDS = [
  'id',
  'status',
  'documentNo',
  'version',
  'buyerPartyId',
  'sellerPartyId',
  'termsSnapshot',
] as const;

@Injectable()
export class OrdersService {
  constructor(private readonly db: MemoryPlatform) {}

  list(ctx: TxCtx, role?: 'buyer' | 'seller') {
    this.db.requireMember(ctx);
    const ids = this.db.participants
      .filter((p) => p.workspaceId === ctx.workspaceId && (!role || p.side === role))
      .map((p) => p.orderId);
    return ids
      .map((id) => this.db.orders.get(id))
      .filter((o) => o !== undefined)
      .map((o) => this.project(ctx, o));
  }

  get(ctx: TxCtx, id: string) {
    const order = this.db.requireOrderAccess(ctx, id);
    return this.project(ctx, order);
  }

  confirm(ctx: TxCtx, id: string, expectedVersion: number) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'orders.confirm');
      const order = this.db.requireOrderAccess(ctx, id);
      if (order.version !== expectedVersion) fail('VERSION_CONFLICT', 'Đơn đã đổi.');
      orderTransition(order.status, 'confirmed');
      order.status = 'confirmed';
      order.version += 1;
      this.db.appendOutbox('order.confirmed', { orderId: id });
      return this.project(ctx, order);
    });
  }

  cancel(ctx: TxCtx, id: string, expectedVersion: number) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'orders.cancel');
      const order = this.db.requireOrderAccess(ctx, id);
      if (order.version !== expectedVersion) fail('VERSION_CONFLICT', 'Đơn đã đổi.');
      const posted = [...this.db.acceptances.values()].some((a) => {
        const f = this.db.fulfillments.get(a.fulfillmentId);
        return f?.orderId === id && a.posted;
      });
      if (posted) fail('INVALID_STATE_TRANSITION', 'Đã nhận hàng — không hủy cả đơn, chỉ đóng phần còn lại.');
      orderTransition(order.status, 'cancelled');
      order.status = 'cancelled';
      order.version += 1;
      for (const r of this.db.reservations.values()) {
        if (r.orderId === id && r.status === 'active') {
          r.status = 'released';
          if (r.harvestLotId) {
            const lot = this.db.lots.get(r.harvestLotId);
            if (lot) {
              lot.reservedQty = subtractQty(lot.reservedQty, r.qty);
            }
          }
        }
      }
      this.db.appendOutbox('order.cancelled', { orderId: id });
      return this.project(ctx, order);
    });
  }

  proposeAppointment(ctx: TxCtx, input: { orderId: string; locationId: string; proposedAt: string }) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'appointments.manage');
      this.db.requireOrderAccess(ctx, input.orderId);
      const loc = this.db.locations.get(input.locationId);
      if (!loc) fail('VALIDATION_FAILED', 'Địa điểm không hợp lệ.');
      const row: Appointment = {
        id: newId(),
        orderId: input.orderId,
        locationId: input.locationId,
        proposedAt: input.proposedAt,
        status: 'proposed',
        version: 1,
      };
      this.db.appointments.set(row.id, row);
      this.db.appendOutbox('appointment.changed', { appointmentId: row.id });
      return row;
    });
  }

  appointmentAction(ctx: TxCtx, id: string, to: Appointment['status'], expectedVersion?: number) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'appointments.manage');
      const a = must(this.db.appointments.get(id));
      this.db.requireOrderAccess(ctx, a.orderId);
      if ((expectedVersion !== null && expectedVersion !== undefined) && a.version !== expectedVersion) fail('VERSION_CONFLICT', 'Lịch đã đổi.');
      appointmentTransition(a.status, to);
      a.status = to;
      a.version += 1;
      this.db.appendOutbox('appointment.changed', { appointmentId: id, status: to });
      return a;
    });
  }

  private project(ctx: TxCtx, order: NonNullable<ReturnType<MemoryPlatform['orders']['get']>>) {
    const participant = this.db.participants.find(
      (p) => p.orderId === order.id && p.workspaceId === ctx.workspaceId,
    );
    const lines = [...this.db.orderLines.values()].filter((l) => l.orderId === order.id);
    const shared = {
      id: order.id,
      status: order.status,
      documentNo: order.documentNo,
      version: order.version,
      role: participant?.side,
      buyerPartyId: order.buyerPartyId,
      sellerPartyId: order.sellerPartyId,
      termsSnapshot: order.termsSnapshot,
      lines,
    };
    const view = this.db.orderViews.find(
      (v) => v.orderId === order.id && v.workspaceId === ctx.workspaceId,
    );
    return {
      ...shared,
      direction: view?.direction,
      // cost/margin/internal notes never included in shared projection
    };
  }
}

const subtractQty = (a: string, b: string): string => {
  const n = Number(a) - Number(b);
  return Math.max(0, n).toFixed(3);
};

void SHARED_ORDER_FIELDS;
