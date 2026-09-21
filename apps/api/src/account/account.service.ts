import { Injectable } from '@nestjs/common';
import { fail } from '../domain/errors';
import { newId, SYSTEM_ROLE_IDS } from '../domain/ids';
import { MemoryPlatform } from '../infra/memory.platform';
import type { TxCtx } from '../infra/types';

@Injectable()
export class AccountService {
  constructor(private readonly db: MemoryPlatform) {}

  requestDeletion(ctx: TxCtx) {
    return this.db.tx(async () => {
      const owned = [...this.db.workspaces.values()].filter(
        (w) => w.ownerUserId === ctx.actorId && w.status === 'active',
      );
      for (const w of owned) {
        const owners = [...this.db.memberships.values()].filter(
          (m) => m.workspaceId === w.id && m.roleId === SYSTEM_ROLE_IDS.owner && m.status === 'active',
        );
        if (owners.length <= 1) {
          fail(
            'VALIDATION_FAILED',
            'Owner phải chuyển quyền hoặc đóng workspace trước khi xóa tài khoản.',
          );
        }
      }
      const row = {
        id: newId(),
        userId: ctx.actorId,
        status: 'pending',
        deadlineAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      };
      this.db.deletionRequests.set(row.id, row);
      const profile = this.db.profiles.get(ctx.actorId);
      if (profile) profile.status = 'pending_deletion';
      this.db.auditEvent(ctx, 'account.deletion_requested', 'user', ctx.actorId);
      this.db.appendOutbox('account.deletion_requested', { userId: ctx.actorId, requestId: row.id });
      return row;
    });
  }

  getDeletion(ctx: TxCtx, id: string) {
    const row = this.db.deletionRequests.get(id);
    if (!row || row.userId !== ctx.actorId) fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    return row;
  }

  exportMine(ctx: TxCtx) {
    const profile = this.db.profiles.get(ctx.actorId);
    const memberships = [...this.db.memberships.values()].filter((m) => m.userId === ctx.actorId);
    return { profile, memberships };
  }
}
