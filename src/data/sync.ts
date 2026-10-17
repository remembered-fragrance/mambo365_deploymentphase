/**
 * Vòng đồng bộ: xả hàng đợi lên (@mambo/sdk /v1/sync/push), kéo thay đổi về (/v1/sync/pull), báo trạng thái.
 *
 * Không nuốt lỗi. Mọi thất bại hoặc được hẹn thử lại theo isRetryable(code),
 * hoặc nổi lên `status.error` để người dùng thấy.
 */

import { emptyData } from '@mambo/core/normalize';
import type { AppData, SyncStatus } from '@mambo/core/types';
import { isRetryable, SYNC_PUSH_MAX_OPS, type SyncOp } from '@mambo/contracts';
import { ApiError, type Client } from '@mambo/sdk';
import { flushAttachments } from './attachments';
import { readSyncMark, writeBook, writeSyncMark } from './cache';
import { apiForOrg } from './client';
import { getDeviceId, openLocalDb, readCursor } from './localDb';
import { mergeChanges } from './pullChanges';
import {
  isDue,
  markConflict,
  markFailed,
  pendingCount,
  pendingOps,
  pendingRecordIds,
  removeOp,
  type QueuedOp,
} from './queue';

export interface SyncOutcome {
  readonly data: AppData;
  readonly status: SyncStatus;
  /** Bản ghi bị máy chủ từ chối — giao diện phải báo, không được im lặng. */
  readonly conflicts: readonly string[];
  /**
   * Con trỏ ứng với `data`. KHÔNG ghi ở đây: store chỉ ghi sổ + con trỏ khi kết quả còn dùng được
   * (không ai ghi phiếu xen vào) — ghi con trỏ mà sổ bị đè thì phiếu của trang đó mất khỏi máy này.
   */
  readonly cursor?: string | null;
}

const message = (err: unknown): string => {
  if (err instanceof ApiError) {
    return `${err.code}: ${err.message}${err.requestId ? ` (id: ${err.requestId})` : ''}`;
  }
  return err instanceof Error ? err.message : 'Không kết nối được máy chủ';
};

/**
 * Máy chủ từ chối GHI vì gói hết hạn, không phải vì mạng.
 */
export const PLAN_BLOCKED = 'Gói đã hết hạn, chưa gửi lên mạng được';

/**
 * Gắn cờ đồng bộ lên từng phiếu để giao diện vẽ được "đang chờ gửi" / "kẹt".
 * Bị máy chủ từ chối là `conflict` — phải hiện cho người dùng, không im lặng.
 */
export const markSyncStates = (
  data: AppData,
  pendingIds: ReadonlySet<string>,
  conflicts: readonly string[],
): AppData => ({
  ...data,
  transactions: data.transactions.map((t) => {
    if (conflicts.includes(t.id)) return { ...t, syncState: 'conflict' as const };
    return { ...t, syncState: pendingIds.has(t.id) ? ('pending' as const) : ('synced' as const) };
  }),
});

// ─── Đẩy lên ─────────────────────────────────────────────────────────────────

export const flushQueue = async (
  deviceId: string,
  orgId: string,
  client: Client = apiForOrg(orgId),
): Promise<{ pushed: number; conflicts: string[]; error?: string; blocked?: boolean }> => {
  const allOps = await pendingOps(orgId);
  const conflicts: string[] = [];
  let pushed = 0;

  const batch: QueuedOp[] = [];
  for (const op of allOps) {
    if (op.conflict) {
      conflicts.push(op.recordId);
      return { pushed: 0, conflicts, error: op.conflict.message };
    }
    if (!isDue(op)) break;
    batch.push(op);
    if (batch.length === SYNC_PUSH_MAX_OPS) break;
  }

  if (batch.length === 0) {
    return { pushed: 0, conflicts };
  }

  const wireOps = batch.map((op) => {
    const wire: Record<string, unknown> = {
      opId: op.opId,
      seq: op.seq,
      entity: op.entity,
      kind: op.kind,
      recordId: op.recordId,
    };
    if (op.kind !== 'softDelete') {
      wire.data = op.data ?? {};
    }
    return wire as unknown as SyncOp;
  });

  try {
    const { results } = await client.sync.push({ deviceId, ops: wireOps });
    const rejectedAt = results.findIndex((result) => result.status === 'rejected');
    if (results.length === 0 || results.some((result, index) => result.opId !== batch[index]?.opId) ||
        (rejectedAt >= 0 ? rejectedAt !== results.length - 1 : results.length !== batch.length)) {
      throw new ApiError('CONTRACT_MISMATCH', 200, 'Sync response does not match the submitted operations');
    }
    for (const r of results) {
      const op = batch.find((b) => b.opId === r.opId);
      if (!op) throw new Error('Unknown operation in sync response');
      if (r.status === 'applied' || r.status === 'duplicate') {
        if (op) await removeOp(op.id, orgId);
        pushed++;
      } else if (r.status === 'rejected') {
        if (r.error?.code === 'PLAN_EXPIRED') return { pushed, conflicts, error: PLAN_BLOCKED, blocked: true };
        if (r.error && isRetryable(r.error.code)) {
          if (op) await markFailed(op, r.error.message, orgId);
        } else {
          if (op) {
            await markConflict(
              op.id,
              orgId,
              r.error ?? { code: 'VALIDATION_FAILED', message: 'Thao tác bị từ chối' },
            );
            conflicts.push(op.recordId);
          }
        }
        return { pushed, conflicts, error: r.error?.message };
      }
    }
  } catch (err) {
    if (err instanceof ApiError && err.code === 'PLAN_EXPIRED') {
      return { pushed, conflicts, error: PLAN_BLOCKED, blocked: true };
    }
    const first = batch[0];
    if (first) {
      if (err instanceof TypeError || (err instanceof ApiError && err.code !== 'CONTRACT_MISMATCH' && isRetryable(err.code))) {
        await markFailed(first, message(err), orgId);
      } else if (err instanceof ApiError) {
        await markConflict(first.id, orgId, { code: err.code, message: err.message });
        conflicts.push(first.recordId);
      }
    }
    return { pushed, conflicts, error: message(err) };
  }

  return { pushed, conflicts };
};

// ─── Một lượt đồng bộ đầy đủ ────────────────────────────────────────────────

export const syncOnce = async (
  _supabaseClient: unknown,
  orgId: string,
  local: AppData,
  isCurrent: () => boolean = () => true,
): Promise<SyncOutcome> => {
  const startedAt = new Date().toISOString();
  const deviceId = getDeviceId();
  const client = apiForOrg(orgId);

  const flush = await flushQueue(deviceId, orgId, client);
  // Ảnh đi hàng đợi riêng; lên trước hay sau op của phiếu đều được. Hỏng thì lượt sau thử lại.
  await flushAttachments(orgId).catch(() => 0);
  const pendingIds = await pendingRecordIds(orgId);

  if (flush.error && flush.blocked) {
    return {
      data: markSyncStates(local, pendingIds, flush.conflicts),
      status: {
        loading: false,
        error: flush.error,
        blocked: true,
        lastSyncedAt: (await readSyncMark(orgId)) ?? undefined,
        pendingCount: await pendingCount(orgId),
      },
      conflicts: flush.conflicts,
    };
  }

  let currentBook = local;
  let currentCursor: string | null = null;
  try {
    currentCursor = await readCursor(orgId);

    // Kéo các trang thay đổi về
    for (let page = 0; page < 200; page++) {
      if (!isCurrent()) throw new Error('Sync context changed');
      const res = await client.sync.pull(currentCursor ? { cursor: currentCursor } : {});
      if (!isCurrent()) throw new Error('Sync context changed');
      if (res.resetRequired) {
        const remaining = await pendingCount(orgId);
        if (remaining > 0) {
          // Hoãn reset cho tới khi xả hết hàng đợi
          break;
        }
        currentBook = emptyData();
        currentCursor = res.cursor;
        continue;
      }

      currentBook = mergeChanges(currentBook, res.changes, pendingIds);
      currentCursor = res.cursor;
      if (!res.hasMore) break;
    }

    if (!isCurrent()) throw new Error('Sync context changed');
    await writeSyncMark(orgId, startedAt);

    const stillPending = await pendingRecordIds(orgId);
    return {
      data: markSyncStates(currentBook, stillPending, flush.conflicts),
      status: {
        loading: false,
        error: flush.error,
        lastSyncedAt: startedAt,
        pendingCount: await pendingCount(orgId),
      },
      conflicts: flush.conflicts,
      cursor: currentCursor,
    };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'PLAN_EXPIRED') {
      return {
        data: markSyncStates(currentBook, pendingIds, flush.conflicts),
        status: {
          loading: false,
          error: PLAN_BLOCKED,
          blocked: true,
          lastSyncedAt: (await readSyncMark(orgId)) ?? undefined,
          pendingCount: await pendingCount(orgId),
        },
        conflicts: flush.conflicts,
        cursor: currentCursor,
      };
    }

    return {
      data: markSyncStates(currentBook, pendingIds, flush.conflicts),
      status: {
        loading: false,
        error: flush.error || message(err),
        lastSyncedAt: (await readSyncMark(orgId)) ?? undefined,
        pendingCount: await pendingCount(orgId),
      },
      conflicts: flush.conflicts,
      cursor: currentCursor,
    };
  }
};

/** Ghi sổ đã gộp cùng con trỏ của nó trong một giao dịch IndexedDB. */
export const saveSyncedBook = async (orgId: string, book: AppData, cursor: string | null | undefined): Promise<void> => {
  if (!cursor) return writeBook(orgId, book);
  const db = await openLocalDb();
  const tx = db.transaction(['books', 'cursors'], 'readwrite');
  await tx.objectStore('books').put(book, orgId);
  await tx.objectStore('cursors').put(cursor, orgId);
  await tx.done;
};

/** Có mạng hay không — `navigator.onLine` chỉ là gợi ý, vẫn phải bắt lỗi mạng. */
export const looksOnline = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false;
