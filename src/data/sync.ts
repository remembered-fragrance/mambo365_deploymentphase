/**
 * Vòng đồng bộ: xả hàng đợi lên (@mambo/sdk /v1/sync/push), kéo thay đổi về (/v1/sync/pull), báo trạng thái.
 *
 * Không nuốt lỗi. Mọi thất bại hoặc được hẹn thử lại theo isRetryable(code),
 * hoặc nổi lên `status.error` để người dùng thấy.
 */

import { isLegacyProductId } from '@mambo/core/catalog';
import { emptyData } from '@mambo/core/normalize';
import type { AppData, SyncStatus } from '@mambo/core/types';
import { isRetryable, SYNC_PUSH_MAX_OPS, type SyncChanges, type SyncOp, type SyncOpResult } from '@mambo/contracts';
import { ApiError, type Client } from '@mambo/sdk';
import { flushAttachments } from './attachments';
import { readSyncMark, writeBook } from './cache';
import { apiForOrg } from './client';
import { getDeviceId, openLocalDb, readCursor } from './localDb';
import { mergeChanges } from './pullChanges';
import {
  dropWithDependents,
  isDue,
  MAX_REJECTED_TRIES,
  markConflict,
  markFailed,
  pendingCount,
  pendingOps,
  pendingRecordIds,
  removeOp,
  type QueuedOp,
} from './queue';

/** Các trang đã kéo về, giữ nguyên dạng máy chủ trả — store gộp lại vào sổ MỚI NHẤT lúc ghi. */
export interface PulledChanges {
  /** Máy chủ bảo dựng lại sổ từ đầu: `pages` là các trang kể từ lần đó. */
  readonly reset: boolean;
  readonly pages: readonly SyncChanges[];
}

export interface SyncOutcome {
  /** `local` đã gộp các trang kéo về — đúng khi không ai ghi xen vào trong lúc kéo. */
  readonly data: AppData;
  readonly pulled: PulledChanges;
  /** Mốc của lượt kéo trọn vẹn. Chỉ ghi "đã đồng bộ lúc…" khi store thực sự lưu kết quả. */
  readonly syncedAt?: string;
  readonly status: SyncStatus;
  /** Bản ghi bị máy chủ từ chối — giao diện phải báo, không được im lặng. */
  readonly conflicts: readonly string[];
  /** Số thao tác đã tự bỏ vì chủ vừa đổi chi nhánh của người này (xem `isBranchScope`). */
  readonly dropped: number;
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

type OpError = NonNullable<SyncOpResult['error']>;

/**
 * Bị từ chối vì phiếu thuộc chi nhánh khác: chủ vừa đổi chi nhánh của người này mà máy còn thao tác
 * trên phiếu chi nhánh cũ. Gửi lại bao nhiêu lần cũng vậy, mà bắt bấm "Bỏ" từng phiếu thì hàng đợi
 * không bao giờ trống để dựng lại sổ theo chi nhánh mới — tự bỏ và báo số đã bỏ.
 */
const isBranchScope = (error: OpError | undefined): boolean =>
  error?.code === 'FORBIDDEN' && error.details?.reason === 'BRANCH_SCOPE';

/** Máy chủ nhận op mà vẫn trả lỗi thử-lại-được: thử tiếp, hay coi là kẹt (xem `MAX_REJECTED_TRIES`). */
const keepRetrying = (op: QueuedOp, error: OpError): boolean =>
  isRetryable(error.code) && (error.code === 'RATE_LIMITED' || op.tries + 1 < MAX_REJECTED_TRIES);

export interface FlushResult {
  pushed: number;
  conflicts: string[];
  error?: string;
  blocked?: boolean;
  dropped: number;
}

export const flushQueue = async (
  deviceId: string,
  orgId: string,
  client: Client = apiForOrg(orgId),
): Promise<FlushResult> => {
  const allOps = await pendingOps(orgId);
  const conflicts: string[] = [];
  let pushed = 0;

  const batch: QueuedOp[] = [];
  for (const op of allOps) {
    // Op của mặt hàng mẫu `prod-…` do bản app cũ xếp vào: máy chủ không bao giờ nhận, mà cũng chẳng có gì
    // để giữ (chỉ là giá gần nhất của mặt hàng mẫu) — gỡ luôn, đừng bắt người dùng bấm "Bỏ".
    if (op.entity === 'product' && isLegacyProductId(op.recordId)) {
      await removeOp(op.id, orgId);
      continue;
    }
    if (op.conflict) {
      conflicts.push(op.recordId);
      return { pushed: 0, conflicts, error: op.conflict.message, dropped: 0 };
    }
    if (!isDue(op)) break;
    batch.push(op);
    if (batch.length === SYNC_PUSH_MAX_OPS) break;
  }

  if (batch.length === 0) {
    return { pushed: 0, conflicts, dropped: 0 };
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
        await removeOp(op.id, orgId);
        pushed++;
      } else if (r.status === 'rejected') {
        if (r.error?.code === 'PLAN_EXPIRED') return { pushed, conflicts, error: PLAN_BLOCKED, blocked: true, dropped: 0 };
        if (isBranchScope(r.error)) {
          // Mỗi lần bỏ ít nhất một op nên vòng này dừng; các op sau nó vẫn được gửi ngay trong lượt.
          const dropped = await dropWithDependents(orgId, op);
          const rest = await flushQueue(deviceId, orgId, client);
          return { ...rest, pushed: pushed + rest.pushed, dropped: dropped + rest.dropped };
        }
        if (r.error && keepRetrying(op, r.error)) {
          await markFailed(op, r.error.message, orgId);
        } else {
          await markConflict(op.id, orgId, r.error ?? { code: 'VALIDATION_FAILED', message: 'Thao tác bị từ chối' });
          conflicts.push(op.recordId);
        }
        return { pushed, conflicts, error: r.error?.message, dropped: 0 };
      }
    }
  } catch (err) {
    if (err instanceof ApiError && err.code === 'PLAN_EXPIRED') {
      return { pushed, conflicts, error: PLAN_BLOCKED, blocked: true, dropped: 0 };
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
    return { pushed, conflicts, error: message(err), dropped: 0 };
  }

  return { pushed, conflicts, dropped: 0 };
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

  // Gói hết hạn chỉ chặn GHI: vẫn kéo về để máy này thấy thay đổi từ máy khác — sổ vẫn đọc được.
  const blocked = flush.blocked ? { error: PLAN_BLOCKED, blocked: true } : {};

  let currentBook = local;
  let currentCursor: string | null = null;
  let reset = false;
  let pages: SyncChanges[] = [];
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
        reset = true;
        pages = [];
        continue;
      }

      currentBook = mergeChanges(currentBook, res.changes, pendingIds);
      pages.push(res.changes);
      currentCursor = res.cursor;
      if (!res.hasMore) break;
    }

    if (!isCurrent()) throw new Error('Sync context changed');

    const stillPending = await pendingRecordIds(orgId);
    return {
      data: markSyncStates(currentBook, stillPending, flush.conflicts),
      status: {
        loading: false,
        error: flush.error,
        lastSyncedAt: startedAt,
        pendingCount: await pendingCount(orgId),
        ...blocked,
      },
      conflicts: flush.conflicts,
      dropped: flush.dropped,
      cursor: currentCursor,
      pulled: { reset, pages },
      syncedAt: startedAt,
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
        dropped: flush.dropped,
        cursor: currentCursor,
        pulled: { reset, pages },
      };
    }

    return {
      data: markSyncStates(currentBook, pendingIds, flush.conflicts),
      status: {
        loading: false,
        error: flush.error || message(err),
        lastSyncedAt: (await readSyncMark(orgId)) ?? undefined,
        pendingCount: await pendingCount(orgId),
        ...blocked,
      },
      conflicts: flush.conflicts,
      dropped: flush.dropped,
      cursor: currentCursor,
      pulled: { reset, pages },
    };
  }
};

/**
 * Gộp các trang đã kéo vào sổ `book` (sổ mới nhất trên màn hình, có thể đã có phiếu ghi xen vào
 * trong lúc kéo). `protectedIds`: bản ghi còn thao tác chưa gửi — giữ bản trên máy.
 * `null`: máy chủ bảo dựng lại sổ mà trên máy còn thao tác chưa gửi — để lượt sau.
 */
export const rebasePulled = (
  book: AppData,
  pulled: PulledChanges,
  protectedIds: ReadonlySet<string>,
): AppData | null => {
  if (pulled.reset && protectedIds.size > 0) return null;
  return pulled.pages.reduce((merged, changes) => mergeChanges(merged, changes, protectedIds), pulled.reset ? emptyData() : book);
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
