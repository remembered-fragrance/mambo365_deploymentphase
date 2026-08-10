/**
 * Vòng đồng bộ: xả hàng đợi lên, kéo thay đổi về, báo trạng thái.
 *
 * Không nuốt lỗi. Mọi thất bại hoặc được hẹn thử lại, hoặc nổi lên
 * `status.error` để người dùng thấy — im lặng là cách chắc chắn nhất để họ
 * tưởng đã lưu trong khi thực ra chưa.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, SyncStatus } from '@/core/types';
import { readSyncMark, writeBook, writeSyncMark } from './cache';
import { fetchChanges, mergeChanges } from './pullChanges';
import {
  isDue,
  isExhausted,
  markFailed,
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

class PolicyRefusal extends Error {
  constructor() {
    super(PLAN_BLOCKED);
    this.name = 'PolicyRefusal';
  }
}

/**
 * `42501` là mã Postgres cho vi phạm row-level security.
 *
 * Sau migration 0008, policy ghi của bảng nghiệp vụ chỉ có hai điều kiện:
 * đúng chủ sở hữu và còn gói. Vế đầu không thể sai ở đây — `clearQueue()` chạy
 * cả lúc đăng nhập lẫn lúc đăng xuất nên hàng đợi không mang thao tác của tài
 * khoản khác. Vì vậy 42501 trên đường ghi nghĩa là hết gói. Thêm điều kiện mới
 * vào policy thì phải xem lại chỗ này.
 */
const isPolicyRefusal = (error: { code?: string; message: string }): boolean =>
  error.code === '42501' || /row-level security/i.test(error.message);

const raise = (error: { code?: string; message: string }): never => {
  if (isPolicyRefusal(error)) throw new PolicyRefusal();
  throw new Error(error.message);
};

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

const applyOp = async (supabase: SupabaseClient, op: QueuedOp): Promise<void> => {
  if (op.kind === 'insert') {
    // Bấm hai lần vì mạng chậm không được thành hai phiếu: id đã có thì bỏ qua.
    const { error } = await supabase
      .from(op.table)
      .upsert(op.payload, { onConflict: 'id', ignoreDuplicates: true });
    if (error) raise(error);
    return;
  }

  if (op.kind === 'update') {
    const { error } = await supabase.from(op.table).update(op.payload).eq('id', op.recordId);
    if (error) raise(error);
    return;
  }

  // Xoá là xoá mềm. Xoá cứng làm bản ghi sống dậy khi máy khác đồng bộ lại.
  const { error } = await supabase
    .from(op.table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', op.recordId);
  if (error) raise(error);
};

/**
 * Xả hàng đợi TUẦN TỰ theo thứ tự tạo. Gặp lỗi là dừng cả lượt: các thao tác
 * sau có thể phụ thuộc thao tác trước (lần trả tiền cần phiếu đã tồn tại).
 */
export const flushQueue = async (
  supabase: SupabaseClient,
): Promise<{ pushed: number; conflicts: string[]; error?: string; blocked?: boolean }> => {
  const ops = await pendingOps();
  const conflicts: string[] = [];
  let pushed = 0;

  for (const op of ops) {
    if (isExhausted(op)) {
      conflicts.push(op.recordId);
      continue;
    }
    if (!isDue(op)) break;

    try {
      await applyOp(supabase, op);
      await removeOp(op.id);
      pushed++;
    } catch (err) {
      // Hết gói: giữ nguyên hàng đợi, KHÔNG tính là một lần thử hỏng. Trả tiền
      // xong là cả hàng đợi tự đi tiếp, không mất phiếu nào.
      if (err instanceof PolicyRefusal) {
        return { pushed, conflicts, error: PLAN_BLOCKED, blocked: true };
      }
      const failed = await markFailed(op, message(err));
      if (isExhausted(failed)) conflicts.push(failed.recordId);
      return { pushed, conflicts, error: message(err) };
    }
  }

  return { pushed, conflicts };
};

// ─── Một lượt đồng bộ đầy đủ ────────────────────────────────────────────────

export const syncOnce = async (
  supabase: SupabaseClient,
  userId: string,
  local: AppData,
): Promise<SyncOutcome> => {
  const startedAt = new Date().toISOString();

  const flush = await flushQueue(supabase);
  const pendingIds = await pendingRecordIds();

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
    const since = await readSyncMark(userId);
    const merged = mergeChanges(local, await fetchChanges(supabase, since), pendingIds);

    await writeBook(userId, merged);
    await writeSyncMark(userId, startedAt);

    const stillPending = await pendingRecordIds();
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
