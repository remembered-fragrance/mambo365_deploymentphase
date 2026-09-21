import { Injectable } from '@nestjs/common';
import { fail } from '../domain/errors';
import { MemoryPlatform } from '../infra/memory.platform';
import type { TxCtx } from '../infra/types';

const ALLOWED = new Set([
  'listing.createDraft',
  'listing.publish',
  'order.confirm',
  'fulfillment.accept',
  'settlement.declare',
  'legacy.recordReceipt',
]);

export interface SyncCommand {
  readonly operationId: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly expectedVersion: number;
  readonly clientCreatedAt: string;
  readonly dependsOn: readonly string[];
  readonly payload: Record<string, unknown>;
}

@Injectable()
export class SyncService {
  constructor(private readonly db: MemoryPlatform) {}

  async commands(
    ctx: TxCtx,
    input: { deviceId: string; workspaceId: string; commands: readonly SyncCommand[] },
    handlers: Record<string, (cmd: SyncCommand, ctx: TxCtx) => Promise<unknown>>,
  ) {
    this.db.requireMember({ ...ctx, workspaceId: input.workspaceId });
    const results: Array<{
      operationId: string;
      status: 'accepted' | 'rejected' | 'conflict' | 'blocked' | 'already_processed';
      version?: number;
      code?: string;
      server?: Record<string, unknown>;
    }> = [];
    const failed = new Set<string>();
    for (const cmd of input.commands) {
      if (!ALLOWED.has(cmd.type)) {
        results.push({
          operationId: cmd.operationId,
          status: 'rejected',
          code: 'VALIDATION_FAILED',
        });
        failed.add(cmd.operationId);
        continue;
      }
      if (cmd.dependsOn.some((d) => failed.has(d))) {
        results.push({ operationId: cmd.operationId, status: 'blocked' });
        failed.add(cmd.operationId);
        continue;
      }
      const existing = this.db.operations.get(cmd.operationId);
      if (existing) {
        results.push({
          operationId: cmd.operationId,
          status: 'already_processed',
          server: existing.response as Record<string, unknown>,
        });
        continue;
      }
      const handler = handlers[cmd.type];
      if (!handler) {
        results.push({ operationId: cmd.operationId, status: 'rejected', code: 'VALIDATION_FAILED' });
        failed.add(cmd.operationId);
        continue;
      }
      try {
        const server = (await handler(cmd, { ...ctx, workspaceId: input.workspaceId })) as Record<string, unknown>;
        this.db.operations.set(cmd.operationId, {
          operationId: cmd.operationId,
          workspaceId: input.workspaceId,
          commandType: cmd.type,
          response: server,
        });
        results.push({
          operationId: cmd.operationId,
          status: 'accepted',
          version: typeof server?.version === 'number' ? server.version : undefined,
          server,
        });
      } catch (err) {
        const code = (err as { code?: string }).code ?? 'VALIDATION_FAILED';
        results.push({
          operationId: cmd.operationId,
          status: code === 'VERSION_CONFLICT' ? 'conflict' : 'rejected',
          code,
        });
        failed.add(cmd.operationId);
      }
    }
    return { results };
  }

  changes(ctx: TxCtx, cursor: string | undefined, limit = 100) {
    this.db.requireMember(ctx);
    const after = cursor ? Number(cursor) : 0;
    if (cursor && (!Number.isFinite(after) || after < 0)) fail('SYNC_CURSOR_EXPIRED', 'Cursor không dùng được. Bootstrap lại.');
    const rows = this.db.feed
      .filter((r) => r.workspaceId === ctx.workspaceId && r.id > after)
      .slice(0, Math.min(limit, 200));
    const nextCursor = rows.length ? String(rows[rows.length - 1].id) : cursor ?? '0';
    return { items: rows, nextCursor };
  }

  bootstrap(ctx: TxCtx) {
    this.db.requireMember(ctx);
    const last = this.db.feed.filter((r) => r.workspaceId === ctx.workspaceId).at(-1);
    return {
      cursor: last ? String(last.id) : '0',
      workspaces: [...this.db.workspaces.values()].filter((w) => w.id === ctx.workspaceId),
    };
  }
}
