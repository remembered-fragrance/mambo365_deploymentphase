/**
 * Vòng đồng bộ: xả hàng đợi lên (@mambo/sdk /v1/sync/push), kéo thay đổi về (/v1/sync/pull), báo trạng thái.
 *
 * Không nuốt lỗi. Mọi thất bại hoặc được hẹn thử lại theo isRetryable(code),
 * hoặc nổi lên `status.error` để người dùng thấy.
 */

import { isLegacyProductId } from '@mambo/core/catalog';
import { emptyData } from '@mambo/core/normalize';
import type { AppData, SyncStatus } from '@mambo/core/types';
import {
  isRetryable,
  SYNC_PUSH_MAX_BYTES,
  SYNC_PUSH_MAX_OPS,
  SyncPushInput,
  type ErrorCode,
  type SyncChanges,
  type SyncEntity,
  type SyncOp,
  type SyncOpKind,
  type SyncOpResult,
  type SyncWarning,
} from '@mambo/contracts';
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
  /** Op máy chủ đã nhận kèm cảnh báo — phải báo người dùng (phiếu bị gỡ khỏi đơn…). */
  readonly warnings: readonly SyncNotice[];
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
  isRetryable(error.code) && (error.code === 'RATE_LIMITED' || (op.rejectedTries ?? 0) + 1 < MAX_REJECTED_TRIES);

/**
 * Máy chủ đã nhận op nhưng có điều phải báo người dùng: phiếu / nháp bị gỡ khỏi đơn, hay bản ghi (phiếu
 * cha của lần trả) đã bị xoá ở máy khác. Lần trả tiền mang theo phiếu cha và số tiền để nói đúng khoản nào.
 */
export interface SyncNotice {
  readonly code: SyncWarning;
  readonly entity: SyncEntity;
  readonly kind: SyncOpKind;
  readonly recordId: string;
  readonly transactionId?: string;
  readonly amount?: number;
}

const noticeOf = (code: SyncWarning, op: QueuedOp): SyncNotice => {
  const { transactionId, amount } = op.entity === 'payment' ? (op.data ?? {}) : {};
  return {
    code,
    entity: op.entity,
    kind: op.kind,
    recordId: op.recordId,
    ...(typeof transactionId === 'string' ? { transactionId } : {}),
    ...(typeof amount === 'number' ? { amount } : {}),
  };
};

export interface FlushResult {
  pushed: number;
  conflicts: string[];
  error?: string;
  blocked?: boolean;
  dropped: number;
  warnings: SyncNotice[];
  /** Cả lượt bị từ chối vì lý do không phải mạng — xem `SyncStatus.refused`. */
  refused?: boolean;
}

/**
 * Một op trên dây cùng các op trong hàng đợi nó thay. Thường chỉ một; các lần tự lưu liên tiếp của một
 * nháp thì gộp lại (`coalesce`). Cờ kẹt / hẹn lại gắn vào `members[0]` — op đứng đầu hàng.
 */
interface Outgoing {
  readonly members: readonly [QueuedOp, ...QueuedOp[]];
  readonly wire: SyncOp;
  /** Số byte của `wire` khi mã hoá trong thân request. */
  readonly bytes: number;
}

const utf8 = new TextEncoder();
const bytesOf = (value: unknown): number => utf8.encode(JSON.stringify(value)).length;

const outgoing = (members: readonly [QueuedOp, ...QueuedOp[]]): Outgoing => {
  // Op cuối mang opId / seq: gửi lại cùng nhóm thì máy chủ trả `duplicate`; nhóm có thêm lần lưu mới thì
  // là opId mới, máy chủ áp. Lấy opId của op ĐẦU thì lần lưu mới bị coi là trùng và mất.
  const last = members[members.length - 1] ?? members[0];
  const wire: Record<string, unknown> = {
    opId: last.opId,
    seq: last.seq,
    entity: last.entity,
    kind: last.kind,
    recordId: last.recordId,
  };
  if (last.kind !== 'softDelete') {
    wire.data = Object.assign({}, ...members.map((op) => op.data ?? {})) as Record<string, unknown>;
  }
  return { members, wire: wire as unknown as SyncOp, bytes: bytesOf(wire) + 1 };
};

/**
 * Nháp tự lưu 700ms sau mỗi lần gõ, mỗi lần một op `update` mang trọn các dòng hàng: gõ một lúc là cả
 * trăm op gần như y hệt. Gộp các op `update` LIỀN NHAU của cùng một nháp thành một — patch là vá từng
 * trường, gộp nông theo thứ tự cũng như áp lần lượt.
 */
const coalesce = (ops: readonly QueuedOp[]): Outgoing[] => {
  const groups: [QueuedOp, ...QueuedOp[]][] = [];
  for (const op of ops) {
    const group = groups[groups.length - 1];
    const prev = group?.[group.length - 1];
    if (group && prev && op.entity === 'draft' && op.kind === 'update' && prev.entity === 'draft' &&
        prev.kind === 'update' && prev.recordId === op.recordId) {
      group.push(op);
    } else {
      groups.push([op]);
    }
  }
  return groups.map(outgoing);
};

/** Lấy từ đầu `items` một lô dưới cả `maxOps` op lẫn `SYNC_PUSH_MAX_BYTES` byte — ít nhất một op. */
const takeBatch = (deviceId: string, items: readonly Outgoing[], maxOps: number): Outgoing[] => {
  let bytes = bytesOf({ deviceId, ops: [] });
  const batch: Outgoing[] = [];
  for (const item of items) {
    if (batch.length >= maxOps || (batch.length > 0 && bytes + item.bytes > SYNC_PUSH_MAX_BYTES)) break;
    batch.push(item);
    bytes += item.bytes;
  }
  return batch;
};

/**
 * Kiểm vỏ lô bằng đúng luật cổng của máy chủ (`SyncPushInput`): vỏ sai thì máy chủ trả 422 cho CẢ lượt,
 * không chỉ ra op nào — lượt nào cũng hỏng y như vậy. Trả số op đầu lô còn gửi được: seq không tăng
 * (hai tab của bản app cũ cấp trùng) thì cắt lô trước chỗ đó, lượt sau op đó đứng đầu lô và đi bình
 * thường. `0` = op đầu lô tự nó sai; `null` = lỗi không nằm ở op nào (`deviceId`).
 */
const sendableCount = (deviceId: string, batch: readonly Outgoing[]): number | null => {
  const check = SyncPushInput.safeParse({ deviceId, ops: batch.map((item) => item.wire) });
  if (check.success) return batch.length;
  const indexes = check.error.issues.map((issue) => (issue.path[0] === 'ops' ? issue.path[1] : undefined));
  if (indexes.some((index) => typeof index !== 'number')) return null;
  return Math.min(...(indexes as number[]));
};

/** Một thao tác một mình đã vượt giới hạn thân của máy chủ — chia lô nữa cũng không lọt. */
const OP_TOO_LARGE = 'Thao tác này quá lớn, máy chủ không nhận. Bỏ thao tác này rồi nhập lại phiếu (bớt dòng hoặc ghi chú).';
const OP_MALFORMED = 'Thao tác sai định dạng, máy chủ không nhận';
const BATCH_MALFORMED = 'VALIDATION_FAILED: mã máy không hợp lệ';

const fail = (code: ErrorCode, text: string) => ({ code, message: text });

/** Proxy trước API có thể trả 413 không kèm thân JSON — SDK khi đó gọi là `INTERNAL`. */
const isTooLarge = (err: unknown): boolean =>
  err instanceof ApiError && (err.code === 'PAYLOAD_TOO_LARGE' || err.status === 413);

/** Một lượt đẩy tối đa ngần này lô; còn op thì lượt đồng bộ sau gửi tiếp. Chặn vòng lặp khi người dùng gõ liên tục. */
const MAX_BATCHES_PER_FLUSH = 50;

/** Các op đầu hàng tới hạn gửi, đúng thứ tự; dừng ở op chưa tới hạn hoặc op đã kẹt (trả riêng). */
const readyOps = async (orgId: string): Promise<{ ready: QueuedOp[]; stuck?: QueuedOp }> => {
  const ready: QueuedOp[] = [];
  for (const op of await pendingOps(orgId)) {
    // Op của mặt hàng mẫu `prod-…` do bản app cũ xếp vào: máy chủ không bao giờ nhận, mà cũng chẳng có gì
    // để giữ (chỉ là giá gần nhất của mặt hàng mẫu) — gỡ luôn, đừng bắt người dùng bấm "Bỏ".
    if (op.entity === 'product' && isLegacyProductId(op.recordId)) {
      await removeOp(op.id, orgId);
      continue;
    }
    if (op.conflict) return { ready, stuck: op };
    if (!isDue(op)) break;
    ready.push(op);
  }
  return { ready };
};

/**
 * Mỗi lúc chỉ một tab đẩy hàng đợi của một tổ chức. Hai tab cùng đẩy thì mỗi tab gộp nháp theo ảnh chụp
 * hàng đợi của riêng nó: tab chậm gửi bản gộp CŨ hơn dưới một opId máy chủ chưa thấy, máy chủ áp đè lên bản
 * mới — chữ vừa gõ mất. Xếp hàng bằng Web Locks thì tab sau đọc lại hàng đợi, op đã lên không còn.
 * Trình duyệt không có Web Locks (Chrome < 69, Safari < 15.4): vẫn đẩy, chỉ không gộp nháp.
 */
const withPushLock = async <T>(orgId: string, task: (exclusive: boolean) => Promise<T>): Promise<T> => {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks?.request) return task(false);
  return locks.request(`thumua365-push:${orgId}`, () => task(true));
};

/**
 * Đẩy hàng đợi của `orgId` lên, nhiều lô liền nhau tới khi hết op tới hạn. Hai loại lỗi, xử lý khác hẳn:
 *
 * - Lỗi của MỘT op (`results[i].status = 'rejected'`): op đó (và chỉ op đó) thử lại theo lịch hoặc kẹt.
 * - Lỗi của CẢ lượt (mạng, 5xx, 413, vỏ request sai, `NOT_A_MEMBER`…): không op nào có lỗi. Đánh dấu op
 *   đầu là kẹt thì "Gửi lại" gặp đúng lỗi cũ, còn "Bỏ" xoá mất một op vô can rồi kẹt tiếp ở op sau.
 *   413 thì tự chia đôi lô; còn lại giữ nguyên hàng đợi, hẹn lại cả lượt và báo lỗi lên `status.error`.
 */
export const flushQueue = (
  deviceId: string,
  orgId: string,
  client: Client = apiForOrg(orgId),
): Promise<FlushResult> =>
  withPushLock(orgId, async (exclusive) => {
    const conflicts: string[] = [];
    const warnings: SyncNotice[] = [];
    let pushed = 0;
    let dropped = 0;
    let stuck: QueuedOp | undefined;
    const done = (rest: Partial<FlushResult> = {}): FlushResult => {
      // Op kẹt từ trước vẫn chặn hàng: lượt này hỏng vì lý do khác cũng không được làm mất nút "Gửi lại" / "Bỏ".
      if (stuck && !conflicts.includes(stuck.recordId)) conflicts.push(stuck.recordId);
      return { pushed, conflicts, warnings, dropped, ...(stuck ? { error: stuck.conflict?.message } : {}), ...rest };
    };

    let maxOps = SYNC_PUSH_MAX_OPS;
    for (let round = 0; round < MAX_BATCHES_PER_FLUSH; round++) {
      // Đọc lại mỗi lô: op mới ghi trong lúc gửi được đi luôn; op người dùng vừa bỏ / đăng xuất vừa xoá
      // không bị gửi theo ảnh chụp cũ.
      const next = await readyOps(orgId);
      stuck = next.stuck;
      const queue = exclusive ? coalesce(next.ready) : next.ready.map((op) => outgoing([op]));
      let batch = takeBatch(deviceId, queue, maxOps);
      const head = batch[0]?.members[0];
      if (!head) return done();

      const sendable = sendableCount(deviceId, batch);
      if (sendable === null) {
        await markFailed(head, BATCH_MALFORMED, orgId);
        return done({ error: BATCH_MALFORMED, refused: true });
      }
      if (sendable === 0) {
        // Op đầu lô tự nó sai vỏ (opId / recordId): lỗi của op này, máy chủ cũng không bao giờ nhận.
        await markConflict(head.id, orgId, fail('VALIDATION_FAILED', OP_MALFORMED));
        conflicts.push(head.recordId);
        return done({ error: OP_MALFORMED });
      }
      batch = batch.slice(0, sendable);

      try {
        const { results } = await client.sync.push({ deviceId, ops: batch.map((item) => item.wire) });
        const rejectedAt = results.findIndex((result) => result.status === 'rejected');
        if (results.length === 0 || results.some((result, index) => result.opId !== batch[index]?.wire.opId) ||
            (rejectedAt >= 0 ? rejectedAt !== results.length - 1 : results.length !== batch.length)) {
          throw new ApiError('CONTRACT_MISMATCH', 200, 'Sync response does not match the submitted operations');
        }
        for (const [index, r] of results.entries()) {
          const item = batch[index];
          if (!item) throw new Error('Unknown operation in sync response');
          const op = item.members[0];
          if (r.status === 'applied' || r.status === 'duplicate') {
            for (const member of item.members) await removeOp(member.id, orgId);
            pushed += item.members.length;
            if (r.warning) warnings.push(noticeOf(r.warning, op));
            continue;
          }
          if (r.error?.code === 'PLAN_EXPIRED') return done({ error: PLAN_BLOCKED, blocked: true });
          if (isBranchScope(r.error)) {
            // Mỗi lần bỏ ít nhất một op nên vòng này dừng; các op sau nó vẫn được gửi ngay trong lượt.
            dropped += await dropWithDependents(orgId, op);
            break;
          }
          if (r.error && keepRetrying(op, r.error)) {
            await markFailed(op, r.error.message, orgId, true);
          } else {
            await markConflict(op.id, orgId, r.error ?? fail('VALIDATION_FAILED', 'Thao tác bị từ chối'));
            conflicts.push(op.recordId);
          }
          return done({ error: r.error?.message });
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === 'PLAN_EXPIRED') return done({ error: PLAN_BLOCKED, blocked: true });
        if (isTooLarge(err)) {
          if (batch.length > 1) {
            maxOps = Math.ceil(batch.length / 2);
            continue;
          }
          // Chỉ còn đúng một op mà vẫn quá lớn: lỗi của op này, chia nữa cũng không lọt.
          await markConflict(head.id, orgId, fail('PAYLOAD_TOO_LARGE', OP_TOO_LARGE));
          conflicts.push(head.recordId);
          return done({ error: OP_TOO_LARGE });
        }
        // Cả lượt hỏng: hẹn lại từ op đầu (giãn cách theo `tries`), không cộng `rejectedTries`, không kẹt.
        await markFailed(head, message(err), orgId);
        const refused = err instanceof ApiError && (err.code === 'CONTRACT_MISMATCH' || !isRetryable(err.code));
        return done({ error: message(err), ...(refused ? { refused } : {}) });
      }
    }
    return done();
  });

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
  const pushState = flush.blocked ? { error: PLAN_BLOCKED, blocked: true } : flush.refused ? { refused: true } : {};

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
        ...pushState,
      },
      conflicts: flush.conflicts,
      dropped: flush.dropped,
      warnings: flush.warnings,
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
        warnings: flush.warnings,
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
        ...pushState,
      },
      conflicts: flush.conflicts,
      dropped: flush.dropped,
      warnings: flush.warnings,
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
