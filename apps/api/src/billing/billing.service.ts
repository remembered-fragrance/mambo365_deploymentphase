import { Injectable } from '@nestjs/common';
import { fail } from '../domain/errors';
import { MemoryPlatform } from '../infra/memory.platform';
import type { TxCtx } from '../infra/types';

/** Billing phần mềm — cấm import SettlementsService. */
@Injectable()
export class BillingService {
  constructor(private readonly db: MemoryPlatform) {}

  status(ctx: TxCtx) {
    this.db.requireMember(ctx);
    const codes = [...(this.db.entitlements.get(ctx.workspaceId as string) ?? new Set())];
    return { workspaceId: ctx.workspaceId, entitlements: codes };
  }

  setActive(ctx: TxCtx, workspaceId: string, active: boolean) {
    if (!ctx.isPlatform) fail('PERMISSION_DENIED', 'Chỉ vận hành được đổi gói.');
    const set = this.db.entitlements.get(workspaceId) ?? new Set<string>();
    if (active) {
      set.add('sync.write');
      set.add('listings.publish');
    } else {
      set.delete('sync.write');
      set.delete('listings.publish');
    }
    this.db.entitlements.set(workspaceId, set);
    this.db.auditEvent(ctx, 'billing.entitlement', 'workspace', workspaceId);
    return { workspaceId, active };
  }
}
