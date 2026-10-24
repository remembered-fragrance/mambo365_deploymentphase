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

import { newId } from '@mambo/core/id';
import type { SyncEntity, SyncOpKind } from '@mambo/contracts';
import { isScopedOp, openLocalDb, type QueuedOp } from './localDb';
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

/** Giãn cách giữa các lần thử lại. Hết mảng thì cứ 5 phút thử một lần. */
export const RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 300_000] as const;

/**
 * Máy chủ đã nhận op mà vẫn trả PARENT_MISSING / INTERNAL chừng này lần (đếm bằng `rejectedTries`, không
 * gồm lần mất mạng; nhanh nhất ~6 phút) thì coi là kẹt:
 * thử nữa cũng vậy, phải hiện banner cho người dùng "Gửi lại" / "Bỏ". Mất mạng, máy chủ bận
 * (RATE_LIMITED) hay cả lượt gửi hỏng thì vẫn thử lại mãi — không phải lỗi của op này.
 */
export const MAX_REJECTED_TRIES = RETRY_DELAYS_MS.length + 1;

/** Op mới phải có người ghi (B8) — xem `QueuedOp.userId`. `opId` cấp sẵn: xếp lại op đã cứu (rescue.ts). */
export const enqueue = async (
  op: NewOp & { readonly orgId: string; readonly userId: string },
  opId: string = newId(),
): Promise<QueuedOp> => {
  if (!op.orgId?.trim()) throw new Error('Organization is required');
  if (!op.userId?.trim()) throw new Error('User is required');
  const now = new Date().toISOString();
  const db = await openLocalDb();
  // Đọc seq lớn nhất và ghi op trong CÙNG một transaction readwrite: tab khác phải đợi transaction này
  // xong mới cấp được số, nên không trùng. Không dựa riêng vào giờ máy: đồng hồ bị chỉnh lùi thì lần trả
  // tiền xếp trước phiếu cha, máy chủ trả PARENT_MISSING mãi vì phiếu cha nằm sau trong hàng.
  const tx = db.transaction('queue', 'readwrite');
  const last = await tx.store.index('seq').openCursor(null, 'prev');
  const queued: QueuedOp = {
    ...op,
    id: opId,
    opId,
    seq: Math.max(Date.now() * 1_000, (last?.value.seq ?? 0) + 1),
    createdAt: now,
    tries: 0,
    nextAttemptAt: now,
  };
  // Preserve immutable patches, including those already in flight.
  await tx.store.put(queued);
  await tx.done;
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

/**
 * Ghi nhận một lần thử thất bại và hẹn lần sau. `rejected`: chính máy chủ từ chối op này (không phải mất
 * mạng hay cả lượt hỏng) — cộng vào `rejectedTries`.
 */
export const markFailed = async (
  op: QueuedOp,
  error: string,
  orgId: string,
  rejected = false,
): Promise<QueuedOp> => {
  if (!isScopedOp(op) || op.orgId !== orgId) throw new Error('Operation organization mismatch');
  const tries = op.tries + 1;
  const delay = RETRY_DELAYS_MS[Math.min(tries - 1, RETRY_DELAYS_MS.length - 1)] ?? 0;
  const next: QueuedOp = {
    ...op,
    tries,
    rejectedTries: (op.rejectedTries ?? 0) + (rejected ? 1 : 0),
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

/** Người dùng bấm "Gửi lại": bỏ cờ từ chối, thử lại ngay ở lượt sau. */
export const retryConflicts = async (orgId: string): Promise<void> => {
  const db = await openLocalDb();
  const now = new Date().toISOString();
  for (const op of await pendingOps(orgId)) {
    if (op.conflict) await db.put('queue', { ...op, conflict: undefined, tries: 0, rejectedTries: 0, nextAttemptAt: now });
  }
};

/**
 * Gỡ `from` cùng các thao tác sau nó của CÙNG bản ghi — chúng dựa trên thay đổi máy chủ không nhận,
 * gửi đi cũng bị từ chối nốt. Bỏ thêm mới một phiếu thì gỡ cả các lần trả của phiếu đó: phiếu cha không
 * còn, máy chủ trả PARENT_MISSING mãi. Trả về đúng các thao tác đã gỡ — op bỏ có thể là lần trả tiền thật,
 * người dùng phải được biết là cái nào (B10).
 */
export const dropWithDependents = async (orgId: string, from: QueuedOp): Promise<QueuedOp[]> => {
  const dropsReceipt = from.kind === 'insert' && from.entity === 'transaction';
  const dropped: QueuedOp[] = [];
  for (const op of await pendingOps(orgId)) {
    if (op.seq < from.seq) continue;
    const childPayment = dropsReceipt && op.entity === 'payment' && op.data?.transactionId === from.recordId;
    if (op.recordId !== from.recordId && !childPayment) continue;
    await removeOp(op.id, orgId);
    dropped.push(op);
  }
  return dropped;
};

/**
 * Người dùng bấm "Bỏ thao tác này": gỡ thao tác bị từ chối đang chặn cả hàng (xem `dropWithDependents`).
 * Trả về thao tác đã gỡ để store đưa bản ghi trên máy về đúng như máy chủ.
 */
export const dropConflictedRecord = async (orgId: string): Promise<QueuedOp | null> => {
  const stuck = (await pendingOps(orgId)).find((op) => op.conflict);
  if (!stuck) return null;
  await dropWithDependents(orgId, stuck);
  return stuck;
};

/**
 * Mốc hẹn hỏng / thiếu (bản ghi IndexedDB lỗi) cho `NaN`, mà `NaN <= now` là false: op đó không bao giờ tới
 * hạn và chặn im cả hàng đợi, không có banner nào để gỡ. Coi như tới hạn — gửi đi thì máy chủ phân xử.
 */
export const isDue = (op: QueuedOp, now = Date.now()): boolean =>
  !(new Date(op.nextAttemptAt).getTime() > now);

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

/**
 * Op trong khu cách ly còn đọc được (không phải op của bản app rất cũ, thiếu cả tổ chức).
 * Khoá trong `legacyQueue` là id của op.
 */
const quarantined = async (): Promise<QueuedOp[]> =>
  (await (await openLocalDb()).getAll('legacyQueue')).filter(isScopedOp);

/** Op của bản app rất cũ chưa có tổ chức — không bao giờ tự gán tổ chức cho chúng. */
export const legacyQueueCount = async (): Promise<number> =>
  (await (await openLocalDb()).getAll('legacyQueue')).filter((op) => !isScopedOp(op)).length;

/**
 * Chỉ để lại trong hàng đợi của `orgId` op do chính `userId` ghi (B8): op của người khác — kể cả op của bản app
 * trước, chưa có người ghi — sang khu cách ly. Op của `userId` đang nằm cách ly (người khác đăng nhập trước đó)
 * thì về lại hàng đợi, giữ nguyên `seq`. Một giao dịch: tab khác không thấy op nằm ở cả hai chỗ.
 */
export const isolateOtherUsers = async (orgId: string, userId: string): Promise<void> => {
  const db = await openLocalDb();
  const tx = db.transaction(['queue', 'legacyQueue'], 'readwrite');
  const queue = tx.objectStore('queue');
  const legacy = tx.objectStore('legacyQueue');
  for (const op of await queue.getAll()) {
    if (!isScopedOp(op) || op.orgId !== orgId || op.userId === userId) continue;
    await legacy.put(op, op.id);
    await queue.delete(op.id);
  }
  for (const key of await legacy.getAllKeys()) {
    const op = await legacy.get(key);
    if (!isScopedOp(op) || op.orgId !== orgId || op.userId !== userId) continue;
    await queue.put(op);
    await legacy.delete(key);
  }
  await tx.done;
};

/** Op của bản app trước (chưa có người ghi) của `orgId` đang nằm cách ly — người dùng xem để nhận. */
export const unownedOps = async (orgId: string): Promise<QueuedOp[]> =>
  (await quarantined()).filter((op) => op.orgId === orgId && !op.userId).sort((a, b) => a.seq - b.seq);

/**
 * Người dùng xác nhận các op chưa có người ghi là của mình: gắn `userId` và đưa về hàng đợi. App không tự đoán
 * — chỉ người dùng biết đó có phải phiếu mình ghi không.
 */
export const claimUnownedOps = async (orgId: string, userId: string): Promise<number> => {
  const ops = await unownedOps(orgId);
  const db = await openLocalDb();
  const tx = db.transaction(['queue', 'legacyQueue'], 'readwrite');
  for (const op of ops) {
    await tx.objectStore('queue').put({ ...op, userId });
    await tx.objectStore('legacyQueue').delete(op.id);
  }
  await tx.done;
  return ops.length;
};

/** Op chưa gửi của `userId` ở `orgId`, cả trong hàng đợi lẫn đang cách ly. */
export const pendingCountOf = async (orgId: string, userId: string): Promise<number> =>
  [...await pendingOps(orgId), ...await quarantined()]
    .filter((op) => op.orgId === orgId && op.userId === userId).length;

/** Còn op nào của `orgId` chưa gửi — của bất kỳ ai, cả trong hàng đợi lẫn đang cách ly. */
export const hasOpsFor = async (orgId: string): Promise<boolean> =>
  [...await pendingOps(orgId), ...await quarantined()].some((op) => op.orgId === orgId);

/** Dọn op của `userId` ở `orgId` (đăng xuất, bị gỡ). Op của người khác giữ nguyên — đó là phiếu của họ. */
export const removeOpsOf = async (orgId: string, userId: string): Promise<void> => {
  const db = await openLocalDb();
  const tx = db.transaction(['queue', 'legacyQueue'], 'readwrite');
  for (const op of await tx.objectStore('queue').getAll()) {
    if (op.orgId === orgId && op.userId === userId) await tx.objectStore('queue').delete(op.id);
  }
  for (const key of await tx.objectStore('legacyQueue').getAllKeys()) {
    const op = await tx.objectStore('legacyQueue').get(key);
    if (isScopedOp(op) && op.orgId === orgId && op.userId === userId) await tx.objectStore('legacyQueue').delete(key);
  }
  await tx.done;
};

/** Đổi tài khoản: hàng đợi của người cũ không được đẩy bằng phiên người mới. */
export const clearQueue = async (): Promise<void> => {
  const db = await openLocalDb();
  await db.clear('queue');
};
