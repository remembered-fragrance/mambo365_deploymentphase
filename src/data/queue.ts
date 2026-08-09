/**
 * Hàng đợi thao tác chờ đẩy lên máy chủ.
 *
 * Nằm trong IndexedDB, KHÔNG nằm trong bộ nhớ React. Đóng app khi đang mất
 * mạng là chuyện thường xuyên nhất của tệp người dùng này — mất thao tác lúc
 * đó là mất đúng phiếu vừa cân xong.
 *
 * Mỗi thao tác có id riêng làm khoá chống trùng: bấm "Hoàn thành" hai lần vì
 * mạng chậm không được thành hai phiếu.
 */

import { newId } from '@/core/id';
import { openLocalDb, type QueuedOp } from './localDb';
import type { TableName } from './rows';

export type { OpKind, QueuedOp } from './localDb';

export type NewOp = Pick<QueuedOp, 'kind' | 'table' | 'payload' | 'recordId'>;

export const opInsert = (
  table: TableName,
  recordId: string,
  payload: Record<string, unknown>,
): NewOp => ({ kind: 'insert', table, recordId, payload });

export const opUpdate = (
  table: TableName,
  recordId: string,
  payload: Record<string, unknown>,
): NewOp => ({ kind: 'update', table, recordId, payload });

export const opSoftDelete = (table: TableName, recordId: string): NewOp => ({
  kind: 'softDelete',
  table,
  recordId,
  payload: {},
});

/** Giãn cách giữa các lần thử lại. Hết mảng là hết lần thử. */
export const RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 300_000] as const;
export const MAX_TRIES = RETRY_DELAYS_MS.length + 1;

export const enqueue = async (op: NewOp): Promise<QueuedOp> => {
  const now = new Date().toISOString();
  const queued: QueuedOp = { ...op, id: newId(), createdAt: now, tries: 0, nextAttemptAt: now };
  const db = await openLocalDb();
  await db.put('queue', queued);
  return queued;
};

/**
 * Thao tác đang chờ, theo ĐÚNG thứ tự tạo.
 * Thứ tự là bắt buộc: đẩy payment lên trước transaction thì khoá ngoại lỗi và
 * khoản trả tiền rơi mất.
 */
export const pendingOps = async (): Promise<QueuedOp[]> => {
  const db = await openLocalDb();
  return db.getAllFromIndex('queue', 'createdAt');
};

export const pendingCount = async (): Promise<number> => {
  const db = await openLocalDb();
  return db.count('queue');
};

export const removeOp = async (opId: string): Promise<void> => {
  const db = await openLocalDb();
  await db.delete('queue', opId);
};

/** Ghi nhận một lần thử thất bại và hẹn lần sau. */
export const markFailed = async (op: QueuedOp, error: string): Promise<QueuedOp> => {
  const tries = op.tries + 1;
  const delay = RETRY_DELAYS_MS[Math.min(tries - 1, RETRY_DELAYS_MS.length - 1)] ?? 0;
  const next: QueuedOp = {
    ...op,
    tries,
    lastError: error,
    nextAttemptAt: new Date(Date.now() + delay).toISOString(),
  };
  const db = await openLocalDb();
  await db.put('queue', next);
  return next;
};

export const isExhausted = (op: QueuedOp): boolean => op.tries >= MAX_TRIES;

export const isDue = (op: QueuedOp, now = Date.now()): boolean =>
  new Date(op.nextAttemptAt).getTime() <= now;

/** Id các bản ghi còn thao tác chưa đẩy được — dùng để vẽ cờ "đang chờ gửi". */
export const pendingRecordIds = async (): Promise<Set<string>> => {
  const ops = await pendingOps();
  return new Set(ops.map((op) => op.recordId));
};

/** Đổi tài khoản: hàng đợi của người cũ không được đẩy bằng phiên người mới. */
export const clearQueue = async (): Promise<void> => {
  const db = await openLocalDb();
  await db.clear('queue');
};
