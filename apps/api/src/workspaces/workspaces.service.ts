import { Injectable } from '@nestjs/common';
import { fail, must } from '../domain/errors';
import { newId, randomToken, sha256, SYSTEM_ROLE_IDS } from '../domain/ids';
import { inviteRoleAllowed } from '../domain/permissions';
import { MemoryPlatform } from '../infra/memory.platform';
import type { TxCtx } from '../infra/types';

@Injectable()
export class WorkspacesService {
  constructor(private readonly db: MemoryPlatform) {}

  get(ctx: TxCtx, id: string) {
    this.db.requireMember({ ...ctx, workspaceId: id });
    const w = must(this.db.workspaces.get(id));
    const members = [...this.db.memberships.values()].filter((m) => m.workspaceId === id);
    return { ...w, members };
  }

  create(
    ctx: TxCtx,
    input: { kind: 'personal_farm' | 'trader' | 'enterprise'; name: string },
  ) {
    return this.db.tx(async () => {
      const partyKind =
        input.kind === 'personal_farm' ? 'farmer' : input.kind === 'trader' ? 'trader' : 'enterprise';
      const seeded = this.db.seedWorkspace({
        userId: ctx.actorId,
        kind: input.kind,
        name: input.name,
        partyKind,
      });
      this.db.auditEvent(ctx, 'workspace.create', 'workspace', seeded.workspace.id);
      return seeded;
    });
  }

  invite(ctx: TxCtx, workspaceId: string, input: { emailOrPhone: string; roleId: string }) {
    return this.db.tx(async () => {
      const m = this.db.requirePermission({ ...ctx, workspaceId }, 'workspaces.invite');
      if (!inviteRoleAllowed(m.roleId, input.roleId)) {
        fail('PERMISSION_DENIED', 'Không được gán vai trò này.');
      }
      const token = randomToken();
      const row = {
        id: newId(),
        workspaceId,
        emailOrPhone: input.emailOrPhone.trim().toLowerCase(),
        roleId: input.roleId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        acceptedAt: null as string | null,
        invitedBy: ctx.actorId,
      };
      this.db.invitations.set(row.id, row);
      this.db.appendOutbox('member.invited', { workspaceId, invitationId: row.id });
      return { invitationId: row.id, token, expiresAt: row.expiresAt };
    });
  }

  accept(ctx: TxCtx, token: string) {
    return this.db.tx(async () => {
      const hash = sha256(token);
      const inv = must(
        [...this.db.invitations.values()].find((i) => i.tokenHash === hash),
        'Lời mời không hợp lệ hoặc đã hết hạn.',
        'VALIDATION_FAILED',
      );
      if (inv.acceptedAt || new Date(inv.expiresAt) <= this.db.now()) {
        fail('VALIDATION_FAILED', 'Lời mời không hợp lệ hoặc đã hết hạn.');
      }
      const existing = this.db.membershipOf(ctx.actorId, inv.workspaceId);
      if (existing?.status === 'active') {
        inv.acceptedAt = this.db.now().toISOString();
        return { workspaceId: inv.workspaceId, membershipId: existing.id, replayed: true };
      }
      const membership = {
        id: existing?.id ?? newId(),
        workspaceId: inv.workspaceId,
        userId: ctx.actorId,
        roleId: inv.roleId,
        status: 'active' as const,
        revokedAt: null,
      };
      this.db.memberships.set(membership.id, membership);
      inv.acceptedAt = this.db.now().toISOString();
      this.db.auditEvent(ctx, 'membership.accept', 'membership', membership.id);
      return { workspaceId: inv.workspaceId, membershipId: membership.id, replayed: false };
    });
  }

  revoke(ctx: TxCtx, membershipId: string) {
    return this.db.tx(async () => {
      const target = must(this.db.memberships.get(membershipId));
      const caller = this.db.requirePermission({ ...ctx, workspaceId: target.workspaceId }, 'workspaces.invite');
      if (target.roleId === SYSTEM_ROLE_IDS.owner && target.status === 'active') {
        fail('PERMISSION_DENIED', 'Không thu hồi owner cuối. Hãy chuyển quyền trước.');
      }
      if (target.userId === caller.userId && caller.roleId === SYSTEM_ROLE_IDS.owner) {
        fail('PERMISSION_DENIED', 'Owner không tự thu hồi chính mình.');
      }
      target.status = 'revoked';
      target.revokedAt = this.db.now().toISOString();
      this.db.appendOutbox('membership.revoked', { membershipId, workspaceId: target.workspaceId });
      return target;
    });
  }

  transferOwner(ctx: TxCtx, workspaceId: string, toMembershipId: string) {
    return this.db.tx(async () => {
      const caller = this.db.requirePermission({ ...ctx, workspaceId }, 'workspaces.transfer_owner');
      const ws = must(this.db.workspaces.get(workspaceId));
      if (ws.ownerUserId !== ctx.actorId) fail('PERMISSION_DENIED', 'Chỉ owner hiện tại được chuyển.');
      const target = must(this.db.memberships.get(toMembershipId), 'Thành viên nhận không hợp lệ.', 'VALIDATION_FAILED');
      if (target.workspaceId !== workspaceId || target.status !== 'active') {
        fail('VALIDATION_FAILED', 'Thành viên nhận không hợp lệ.');
      }
      caller.roleId = SYSTEM_ROLE_IDS.manager;
      target.roleId = SYSTEM_ROLE_IDS.owner;
      ws.ownerUserId = target.userId;
      ws.version += 1;
      this.db.auditEvent(ctx, 'workspace.transfer_owner', 'workspace', workspaceId);
      return ws;
    });
  }
}
