import { Injectable } from '@nestjs/common';
import { AppError, fail, must } from '../domain/errors';
import { newId } from '../domain/ids';
import { MemoryPlatform } from '../infra/memory.platform';
import type { Profile, TxCtx, WorkspaceKind } from '../infra/types';

const KIND_MAP: Record<'farmer' | 'trader' | 'enterprise', { ws: WorkspaceKind; party: 'farmer' | 'trader' | 'enterprise' }> =
  {
    farmer: { ws: 'personal_farm', party: 'farmer' },
    trader: { ws: 'trader', party: 'trader' },
    enterprise: { ws: 'enterprise', party: 'enterprise' },
  };

@Injectable()
export class IdentityService {
  constructor(private readonly db: MemoryPlatform) {}

  me(userId: string) {
    const profile = this.db.profiles.get(userId) ?? null;
    const memberships = [...this.db.memberships.values()].filter(
      (m) => m.userId === userId && m.status === 'active',
    );
    const workspaces = memberships.map((m) => {
      const w = this.db.workspaces.get(m.workspaceId);
      return w
        ? { id: w.id, kind: w.kind, name: w.name, roleId: m.roleId, status: w.status }
        : null;
    }).filter(Boolean);
    return {
      userId,
      profile,
      verified: {
        phone: Boolean(profile?.phoneVerifiedAt),
        email: Boolean(profile?.emailVerifiedAt),
      },
      workspaces,
      lastWorkspaceId: this.db.lastWorkspace.get(userId) ?? null,
    };
  }

  onboarding(
    ctx: TxCtx,
    input: { kind: 'farmer' | 'trader' | 'enterprise'; displayName: string; workspaceName?: string },
  ) {
    return this.db.tx(async () => {
      let profile = this.db.profiles.get(ctx.actorId);
      if (!profile) {
        profile = {
          id: ctx.actorId,
          name: input.displayName,
          username: null,
          phone: null,
          recoveryEmail: null,
          businessName: input.kind === 'trader' ? input.displayName : null,
          status: 'active',
          locale: 'vi',
          phoneVerifiedAt: null,
          emailVerifiedAt: null,
        };
        this.db.profiles.set(ctx.actorId, profile);
      }
      const map = KIND_MAP[input.kind];
      const existing = [...this.db.workspaces.values()].find(
        (w) => w.ownerUserId === ctx.actorId && w.kind === map.ws && w.status !== 'closed',
      );
      if (existing) {
        const party = this.db.partyByWorkspace(existing.id);
        this.db.lastWorkspace.set(ctx.actorId, existing.id);
        return { profile, workspace: existing, partyId: party.id, replayed: true };
      }
      const { workspace, party } = this.db.seedWorkspace({
        userId: ctx.actorId,
        kind: map.ws,
        name: input.workspaceName ?? input.displayName,
        partyKind: map.party,
      });
      this.db.lastWorkspace.set(ctx.actorId, workspace.id);
      this.db.auditEvent(ctx, 'onboarding', 'workspace', workspace.id);
      this.db.appendOutbox('user.registered', { userId: ctx.actorId, workspaceId: workspace.id });
      return { profile, workspace, partyId: party.id, replayed: false };
    });
  }

  patchMe(userId: string, patch: Partial<Pick<Profile, 'name' | 'businessName' | 'locale'>>) {
    const profile = must(this.db.profiles.get(userId), 'Chưa hoàn tất onboarding.', 'VALIDATION_FAILED');
    const next = { ...profile, ...patch };
    this.db.profiles.set(userId, next);
    return next;
  }

  selectWorkspace(ctx: TxCtx, workspaceId: string) {
    const m = this.db.membershipOf(ctx.actorId, workspaceId);
    if (!m || m.status !== 'active') fail('WORKSPACE_ACCESS_REVOKED', 'Không còn quyền trên không gian này.');
    this.db.lastWorkspace.set(ctx.actorId, workspaceId);
    return { workspaceId };
  }

  registerDevice(userId: string, deviceId: string, platform: 'web' | 'android') {
    const existing = [...this.db.devices.values()].find((d) => d.userId === userId && d.deviceId === deviceId);
    if (existing) {
      existing.revokedAt = null;
      return existing;
    }
    const row = { id: newId(), userId, deviceId, platform, revokedAt: null };
    this.db.devices.set(row.id, row);
    return row;
  }

  revokeDevice(userId: string, id: string) {
    const d = this.db.devices.get(id);
    if (!d || d.userId !== userId) throw new AppError('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    d.revokedAt = new Date().toISOString();
    return d;
  }

  revokeAllSessions(userId: string) {
    for (const d of this.db.devices.values()) {
      if (d.userId === userId) d.revokedAt = new Date().toISOString();
    }
  }
}
