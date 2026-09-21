/**
 * Vòng đồng bộ: xả hàng đợi lên, kéo thay đổi về, báo trạng thái.
 *
 * Không nuốt lỗi. Mọi thất bại hoặc được hẹn thử lại, hoặc nổi lên
 * `status.error` để người dùng thấy — im lặng là cách chắc chắn nhất để họ
 * tưởng đã lưu trong khi thực ra chưa.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, SyncStatus } from '@/core/types';
import { apiRequest, ApiError } from './api';
import { readSyncMark, writeBook, writeSyncMark } from './cache';
import { mergeChanges, type RemoteChanges } from './pullChanges';
import {
  isDue,
  isExhausted,
  markFailed,
  markAttempted,
  pendingOps,
  pendingRecordIds,
  removeOp,
  type QueuedOp,
} from './queue';

export interface SyncOutcome {
  readonly data: AppData;
  readonly status: SyncStatus;
  /** Bản ghi đã hết lần thử — giao diện phải báo, không được im lặng. */
  readonly conflicts: readonly string[];
}

const message = (err: unknown): string =>
  err instanceof Error ? err.message : 'Không kết nối được máy chủ';

/**
 * Máy chủ từ chối GHI vì gói hết hạn, không phải vì mạng.
 *
 * Phân biệt được là bắt buộc: lỗi mạng thì thử lại 5 lần rồi báo "kẹt", còn
 * cái này thử lại bao nhiêu lần cũng vậy cho tới khi người dùng trả tiền. Đốt
 * hết lượt thử ở đây nghĩa là mọi phiếu ghi trong lúc hết hạn đều bị đánh dấu
 * "cần xem lại" — trong khi chúng hoàn toàn lành lặn và chỉ đang đợi.
 */
export const PLAN_BLOCKED = 'Gói đã hết hạn, chưa gửi lên mạng được';

/**
 * Gắn cờ đồng bộ lên từng phiếu để giao diện vẽ được "đang chờ gửi" / "kẹt".
 * Hết lần thử là `conflict` — phải hiện cho người dùng, không im lặng.
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

const applyOp = async (supabase: SupabaseClient, op: QueuedOp, userId: string): Promise<void> => {
  await apiRequest(supabase, '/legacy/commands', {method:'POST', userId, operationId:op.id, body:{operationId:op.id,kind:op.kind,table:op.table,recordId:op.recordId,payload:op.payload}});
};

/**
 * Xả hàng đợi TUẦN TỰ theo thứ tự tạo. Gặp lỗi là dừng cả lượt: các thao tác
 * sau có thể phụ thuộc thao tác trước (lần trả tiền cần phiếu đã tồn tại).
 */
export const flushQueue = async (
  supabase: SupabaseClient,
  userId?: string,
): Promise<{ pushed: number; conflicts: string[]; error?: string; blocked?: boolean }> => {
  const owner = userId ?? (await supabase.auth.getSession()).data.session?.user.id;
  if (!owner) return {pushed:0,conflicts:[],error:'Cần đăng nhập.'};
  const ops = await pendingOps(owner);
  const conflicts: string[] = [];
  let pushed = 0;

  for (const op of ops) {
    if (isExhausted(op)) {
      conflicts.push(op.recordId);
      return { pushed, conflicts, error: 'Có thao tác chưa đồng bộ cần xử lý trước khi gửi tiếp.' };
    }
    if (!isDue(op)) break;

    try {
      const frozen = await markAttempted(op.id);
      if (!frozen) continue;
      await applyOp(supabase, frozen, owner);
      await removeOp(op.id);
      pushed++;
    } catch (err) {
      // Hết gói: giữ nguyên hàng đợi, KHÔNG tính là một lần thử hỏng. Trả tiền
      // xong là cả hàng đợi tự đi tiếp, không mất phiếu nào.
      if (err instanceof ApiError && err.code === 'PLAN_LIMIT_REACHED') {
        return { pushed, conflicts, error: PLAN_BLOCKED, blocked: true };
      }
      const failed = await markFailed(op, message(err));
      if (isExhausted(failed)) conflicts.push(failed.recordId);
      return { pushed, conflicts, error: message(err) };
    }
  }

  const unowned = (await pendingOps()).some(op => !op.userId && typeof op.payload.user_id !== 'string');
  return { pushed, conflicts, ...(unowned ? {error:'Còn dữ liệu chờ từ phiên bản cũ chưa xác định tài khoản. Dữ liệu vẫn được giữ trên thiết bị; cần đối chiếu trước khi gửi.'} : {}) };
};

// ─── Một lượt đồng bộ đầy đủ ────────────────────────────────────────────────

export const syncOnce = async (
  supabase: SupabaseClient,
  userId: string,
  local: AppData,
): Promise<SyncOutcome> => {
  const startedAt = new Date().toISOString();

  try { await apiRequest(supabase, '/legacy/claim', {method:'POST',userId,operationId:'legacy-claim:'+userId}); }
  catch(err) { return {data:local,status:{loading:false,error:message(err),pendingCount:(await pendingOps(userId)).length},conflicts:[]}; }
  const flush = await flushQueue(supabase,userId);
  const pendingIds = await pendingRecordIds(userId);

  if (flush.error) {
    return {
      data: markSyncStates(local, pendingIds, flush.conflicts),
      status: {
        loading: false,
        error: flush.error,
        blocked: flush.blocked,
        lastSyncedAt: (await readSyncMark(userId)) ?? undefined,
        pendingCount: pendingIds.size,
      },
      conflicts: flush.conflicts,
    };
  }

  try {
    const saved = await readSyncMark('api:'+userId);
    let cursor = saved ?? '0';
    let merged = local;
    for (let page=0;page<50;page++) {
      const result=await apiRequest<{changes:RemoteChanges;nextCursor:string;hasMore:boolean}>(supabase,'/legacy/changes?cursor='+encodeURIComponent(cursor),{userId});
      merged=mergeChanges(merged,result.changes,pendingIds);
      cursor=result.nextCursor;
      // Persist data before its cursor. If interrupted, the same page can replay safely.
      await writeBook(userId,merged);
      await writeSyncMark('api:'+userId,cursor);
      if(!result.hasMore)break;
    }
    await writeSyncMark(userId, startedAt);

    const stillPending = await pendingRecordIds(userId);
    return {
      data: markSyncStates(merged, stillPending, flush.conflicts),
      status: {
        loading: false,
        lastSyncedAt: startedAt,
        pendingCount: stillPending.size,
      },
      conflicts: flush.conflicts,
    };
  } catch (err) {
    return {
      data: markSyncStates(local, pendingIds, flush.conflicts),
      status: {
        loading: false,
        error: message(err),
        lastSyncedAt: (await readSyncMark(userId)) ?? undefined,
        pendingCount: pendingIds.size,
      },
      conflicts: flush.conflicts,
    };
  }
};

/** Có mạng hay không — `navigator.onLine` chỉ là gợi ý, vẫn phải bắt lỗi mạng. */
export const looksOnline = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false;
