/**
 * Hàng đợi thao tác chờ đẩy lên máy chủ.
 *
 * Nằm trong IndexedDB, KHÔNG nằm trong bộ nhớ React. Đóng app khi đang mất
 * mạng là chuyện thường xuyên nhất của tệp người dùng này — mất thao tác lúc
 * đó là mất đúng phiếu vừa cân xong.
 *
 * Mỗi thao tác có id / opId riêng làm khoá chống trùng: bấm "Hoàn thành" hai lần vì
 * mạng chậm không được thành hai phiếu.
 */

import { newId } from '@/core/id';
import type { SyncEntity, SyncOpKind } from '@mambo/contracts';
import { isScopedOp, nextSeq, openLocalDb, type QueuedOp } from './localDb';
import type { TableName } from './rows';

export type { OpKind, QueuedOp } from './localDb';

export const TABLE_TO_ENTITY: Readonly<Record<string, SyncEntity>> = {
  suppliers: 'supplier',
  buyers: 'buyer',
  products: 'product',
  pricing_rules: 'pricingRule',
  notes: 'note',
  drafts: 'draft',
  transactions: 'transaction',
  payments: 'payment',
};

export const ENTITY_TO_TABLE: Readonly<Record<SyncEntity, TableName>> = {
  supplier: 'suppliers',
  buyer: 'buyers',
  product: 'products',
  pricingRule: 'pricing_rules',
  note: 'notes',
  draft: 'drafts',
  transaction: 'transactions',
  payment: 'payments',
};

export interface NewOp {
  readonly kind: SyncOpKind;
  readonly entity: SyncEntity;
  readonly recordId: string;
  readonly data?: Record<string, unknown>;
  readonly orgId?: string;

  /** Tương thích ngược với test và code cũ */
  readonly table?: TableName;
  readonly payload?: Record<string, unknown>;
}

export const opInsert = (
  entityOrTable: SyncEntity | TableName,
  recordId: string,
  dataOrPayload: Record<string, unknown>,
): NewOp => {
  const entity = (TABLE_TO_ENTITY[entityOrTable] ?? entityOrTable) as SyncEntity;
  const table = (ENTITY_TO_TABLE[entity as SyncEntity] ?? entityOrTable) as TableName;
  return {
    kind: 'insert',
    entity,
    table,
    recordId,
    data: dataOrPayload,
    payload: dataOrPayload,
  };
};

export const opUpdate = (
  entityOrTable: SyncEntity | TableName,
  recordId: string,
  dataOrPayload: Record<string, unknown>,
): NewOp => {
  const entity = (TABLE_TO_ENTITY[entityOrTable] ?? entityOrTable) as SyncEntity;
  const table = (ENTITY_TO_TABLE[entity as SyncEntity] ?? entityOrTable) as TableName;
  return {
    kind: 'update',
    entity,
    table,
    recordId,
    data: dataOrPayload,
    payload: dataOrPayload,
  };
};

export const opSoftDelete = (
  entityOrTable: SyncEntity | TableName,
  recordId: string,
): NewOp => {
  const entity = (TABLE_TO_ENTITY[entityOrTable] ?? entityOrTable) as SyncEntity;
  const table = (ENTITY_TO_TABLE[entity as SyncEntity] ?? entityOrTable) as TableName;
  return {
    kind: 'softDelete',
    entity,
    table,
    recordId,
    payload: {},
  };
};

/** Giãn cách giữa các lần thử lại. Hết mảng là hết lần thử. */
export const RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 300_000] as const;
export const MAX_TRIES = RETRY_DELAYS_MS.length + 1;

export const enqueue = async (op: NewOp & { readonly orgId: string }): Promise<QueuedOp> => {
  if (!op.orgId?.trim()) throw new Error('Organization is required');
  const now = new Date().toISOString();
  const opId = newId();
  const queued: QueuedOp = {
    ...op,
    id: opId,
    opId,
    seq: nextSeq(),
    createdAt: now,
    tries: 0,
    nextAttemptAt: now,
  };
  const db = await openLocalDb();

  // Preserve immutable patches, including those already in flight.
  await db.put('queue', queued);
  return queued;
};

/**
 * Thao tác đang chờ, theo ĐÚNG thứ tự seq.
 * Thứ tự là bắt buộc: đẩy transaction trước, payment sau.
 */
export const pendingOps = async (orgId: string): Promise<QueuedOp[]> => {
  const db = await openLocalDb();
  if (!orgId) throw new Error('Organization is required');
  return (await db.getAllFromIndex('queue', 'seq')).filter((op) => isScopedOp(op) && op.orgId === orgId);
};

export const pendingCount = async (orgId: string): Promise<number> => {
  return (await pendingOps(orgId)).length;
};

export const removeOp = async (opId: string, orgId: string): Promise<void> => {
  const db = await openLocalDb();
  const op = await db.get('queue', opId);
  if (op?.orgId === orgId) await db.delete('queue', opId);
};

/** Ghi nhận một lần thử thất bại và hẹn lần sau. */
export const markFailed = async (op: QueuedOp, error: string, orgId: string): Promise<QueuedOp> => {
  if (!isScopedOp(op) || op.orgId !== orgId) throw new Error('Operation organization mismatch');
  const tries = op.tries + 1;
  const delay = RETRY_DELAYS_MS[Math.min(tries - 1, RETRY_DELAYS_MS.length - 1)] ?? 0;
  const next: QueuedOp = {
    ...op,
    tries,
    lastError: error,
    nextAttemptAt: new Date(Date.now() + delay).toISOString(),
  };
  const db = await openLocalDb();
  const current = await db.get('queue', op.id);
  if (current?.orgId === orgId) await db.put('queue', next);
  return next;
};

export const markConflict = async (
  opId: string,
  orgId: string,
  error: { code: string; message: string; details?: unknown },
): Promise<void> => {
  const db = await openLocalDb();
  const op = await db.get('queue', opId);
  if (op?.orgId === orgId) {
    await db.put('queue', { ...op, conflict: error });
  }
};

export const isExhausted = (op: QueuedOp): boolean => op.tries >= MAX_TRIES;

export const isDue = (op: QueuedOp, now = Date.now()): boolean =>
  new Date(op.nextAttemptAt).getTime() <= now;

/** Id các bản ghi còn thao tác chưa đẩy được — dùng để vẽ cờ "đang chờ gửi". */
export const pendingRecordIds = async (orgId: string): Promise<Set<string>> => {
  const ops = await pendingOps(orgId);
  const ids = new Set(ops.map((op) => op.recordId));
  for (const op of ops) {
    const parentId = op.entity === 'payment' ? op.data?.transactionId : undefined;
    if (typeof parentId === 'string') ids.add(parentId);
  }
  return ids;
};

/** Quarantined operations remain recoverable, but must never be assigned an org automatically. */
export const legacyQueueCount = async (): Promise<number> =>
  (await openLocalDb()).count('legacyQueue');

/** Đổi tài khoản: hàng đợi của người cũ không được đẩy bằng phiên người mới. */
export const clearQueue = async (): Promise<void> => {
  const db = await openLocalDb();
  await db.clear('queue');
};
