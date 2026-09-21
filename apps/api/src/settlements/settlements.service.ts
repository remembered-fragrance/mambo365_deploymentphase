import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { fail, must } from '../domain/errors';
import { newId } from '../domain/ids';
import { settlementTransition } from '../domain/machines';
import { MemoryPlatform } from '../infra/memory.platform';
import type { Settlement, TxCtx } from '../infra/types';

@Injectable()
export class SettlementsService {
  constructor(private readonly db: MemoryPlatform) {}

  declare(
    ctx: TxCtx,
    input: {
      direction: 'in' | 'out';
      amount: string;
      valueDate: string;
      operationId?: string;
    },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'settlements.declare');
      const run = () => {
        const amount = new Decimal(input.amount);
        if (!amount.gt(0) || !amount.isInteger()) {
          fail('VALIDATION_FAILED', 'Số tiền VND phải nguyên dương (đã làm tròn nghìn ở chứng từ nguồn).');
        }
        const row: Settlement = {
          id: newId(),
          workspaceId: ctx.workspaceId as string,
          direction: input.direction,
          amount: amount.toFixed(0),
          status: 'declared',
          declaredBy: ctx.actorId,
          valueDate: input.valueDate,
          version: 1,
        };
        this.db.settlements.set(row.id, row);
        this.db.appendOutbox('settlement.declared', { settlementId: row.id });
        this.db.appendFeed(ctx, row.workspaceId, 'settlement', row.id, 'upsert', { status: row.status });
        return row;
      };
      if (input.operationId && ctx.workspaceId) {
        return this.db.rememberOperation(input.operationId, ctx.workspaceId, 'settlement.declare', run) as Settlement;
      }
      return run();
    });
  }

  confirm(ctx: TxCtx, id: string) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'settlements.confirm');
      const s = this.must(ctx, id);
      settlementTransition(s.status, 'posted');
      s.status = 'posted';
      s.version += 1;
      this.db.appendOutbox('settlement.posted', { settlementId: s.id });
      this.db.auditEvent(ctx, 'settlement.confirm', 'settlement', s.id);
      return s;
    });
  }

  reject(ctx: TxCtx, id: string) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'settlements.confirm');
      const s = this.must(ctx, id);
      settlementTransition(s.status, 'rejected');
      s.status = 'rejected';
      s.version += 1;
      return s;
    });
  }

  allocate(
    ctx: TxCtx,
    id: string,
    input: { entryId?: string; orderId?: string; amount: string; operationId?: string },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'settlements.allocate');
      const run = () => this.allocateInner(ctx, id, input);
      if (input.operationId && ctx.workspaceId) {
        return this.db.rememberOperation(input.operationId, ctx.workspaceId, 'settlement.allocate', run);
      }
      return run();
    });
  }

  reverse(ctx: TxCtx, id: string, reason: string) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'settlements.reverse');
      const s = this.must(ctx, id);
      settlementTransition(s.status, 'reversed');
      s.status = 'reversed';
      s.version += 1;
      this.db.reversals.push({
        id: newId(),
        targetType: 'settlement',
        targetId: s.id,
        reason,
        actorId: ctx.actorId,
      });
      this.db.appendOutbox('settlement.reversed', { settlementId: s.id });
      this.db.appendFeed(ctx, s.workspaceId, 'settlement', s.id, 'reverse', { reason });
      this.db.auditEvent(ctx, 'settlement.reverse', 'settlement', s.id);
      return s;
    });
  }

  debts(ctx: TxCtx, filter?: 'due' | 'overdue') {
    this.db.requirePermission(ctx, 'workspaces.read');
    const today = this.db.now().toISOString().slice(0, 10);
    return [...this.db.rpEntries.values()]
      .filter((e) => e.workspaceId === ctx.workspaceId && e.status === 'open')
      .map((e) => {
        const allocated = this.db.allocations
          .filter((a) => a.entryId === e.id)
          .reduce((s, a) => s.plus(a.amount), new Decimal(0));
        const remaining = new Decimal(e.amount).minus(allocated);
        return { ...e, remaining: remaining.toFixed(0) };
      })
      .filter((e) => remainingPositive(e.remaining))
      .filter((e) => {
        if (filter === 'overdue') return Boolean(e.dueDate && e.dueDate < today);
        if (filter === 'due') return Boolean(e.dueDate && e.dueDate <= today);
        return true;
      });
  }

  private allocateInner(
    ctx: TxCtx,
    id: string,
    input: { entryId?: string; orderId?: string; amount: string },
  ) {
    const s = this.must(ctx, id);
    if (s.status !== 'posted') fail('INVALID_STATE_TRANSITION', 'Chỉ phân bổ khoản đã ghi sổ.');
    const amount = new Decimal(input.amount);
    if (!amount.gt(0)) fail('VALIDATION_FAILED', 'Số phân bổ phải > 0.');
    const used = this.db.allocations
      .filter((a) => a.settlementId === s.id)
      .reduce((sum, a) => sum.plus(a.amount), new Decimal(0));
    const reversed = this.db.reversals.filter((r) => r.targetId === s.id).length > 0;
    if (reversed) fail('INVALID_STATE_TRANSITION', 'Khoản đã đảo.');
    if (used.plus(amount).gt(s.amount)) fail('VALIDATION_FAILED', 'Tổng phân bổ vượt số tiền khoản.');
    if (input.entryId) {
      const entry = this.db.rpEntries.get(input.entryId);
      if (!entry || entry.workspaceId !== ctx.workspaceId) {
        fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
      }
    }
    const row = {
      id: newId(),
      settlementId: s.id,
      workspaceId: s.workspaceId,
      entryId: input.entryId ?? null,
      orderId: input.orderId ?? null,
      amount: amount.toFixed(0),
    };
    this.db.allocations.push(row);
    this.db.appendOutbox('settlement.allocated', { allocationId: row.id });
    return row;
  }

  private must(ctx: TxCtx, id: string): Settlement {
    const s = must(this.db.settlements.get(id));
    if (s.workspaceId !== ctx.workspaceId) fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    return s;
  }
}

const remainingPositive = (n: string): boolean => new Decimal(n).gt(0);
