/**
 * Kết nối IndexedDB dùng chung và hình dạng của các kho cục bộ.
 *
 * Tách riêng khỏi `cache.ts` / `queue.ts` / `attachments.ts` để ba file đó
 * không phải import lẫn nhau chỉ vì cùng dùng một kết nối.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { z } from 'zod';
import { newId } from '@mambo/core/id';
import type { SyncEntity, SyncOpKind } from '@mambo/contracts';
import type { TableName } from './rows';

const DB_NAME = 'thumua365';
const DB_VERSION = 5;

export type OpKind = SyncOpKind;

/** Một thao tác ghi đang chờ đẩy lên máy chủ. */
export interface QueuedOp {
  /** Khoá chống trùng / opId: bấm hai lần vì mạng chậm không thành hai phiếu. */
  readonly id: string;
  readonly opId: string;
  readonly kind: SyncOpKind;
  readonly entity: SyncEntity;
  readonly recordId: string;
  /** Dữ liệu op theo schema zod của contracts (camelCase) */
  readonly data?: Record<string, unknown>;
  readonly orgId: string;

  /** Tương thích ngược với code cũ */
  readonly table?: TableName;
  readonly payload?: Record<string, unknown>;

  /**
   * Số thứ tự tăng dần — khoá sắp xếp của hàng đợi. Cấp trong transaction ghi op (`enqueue`):
   * luôn lớn hơn mọi op đang chờ, dù đồng hồ máy bị chỉnh lùi hay hai tab cùng ghi.
   *
   * 🔴 KHÔNG dùng `createdAt` để sắp: một lần bấm "Trả đủ & xong" xếp bốn thao
   * tác trong cùng một mili giây.
   */
  readonly seq: number;
  readonly createdAt: string;
  /** Mọi lần gửi hỏng (mất mạng, cả lượt bị từ chối, máy chủ từ chối op) — chỉ để giãn cách thử lại. */
  readonly tries: number;
  /**
   * Số lần MÁY CHỦ từ chối chính op này với lỗi thử-lại-được (PARENT_MISSING / INTERNAL) — quyết định khi
   * nào thành kẹt (`MAX_REJECTED_TRIES`). Mất mạng không cộng vào: rớt mạng 4 lần rồi gặp một lần
   * INTERNAL không được thành kẹt ngay. Op của bản app cũ không có trường này = 0.
   */
  readonly rejectedTries?: number;
  readonly nextAttemptAt: string;
  readonly lastError?: string;
  readonly conflict?: { code: string; message: string; details?: unknown };
}

/** Runtime guard also protects queues created by older or interrupted deployments. */
export const isScopedOp = (value: unknown): value is QueuedOp => {
  if (!value || typeof value !== 'object') return false;
  const op = value as Partial<QueuedOp>;
  return typeof op.orgId === 'string' && Boolean(op.orgId.trim()) &&
    typeof op.opId === 'string' && Boolean(op.opId) &&
    typeof op.id === 'string' && Boolean(op.id) &&
    ['supplier', 'buyer', 'product', 'pricingRule', 'note', 'draft', 'transaction', 'payment'].includes(op.entity ?? '') &&
    ['insert', 'update', 'softDelete'].includes(op.kind ?? '') &&
    typeof op.recordId === 'string' && Boolean(op.recordId) &&
    Number.isSafeInteger(op.seq);
};

interface LocalDbSchema extends DBSchema {
  /** Sổ của từng tài khoản / tổ chức. Khoá = orgId hoặc userId. */
  books: { key: string; value: unknown };
  legacyQueue: { key: string; value: unknown };
  queue: { key: string; value: QueuedOp; indexes: { seq: number } };
  /** Cursors phân trang theo tổ chức */
  cursors: { key: string; value: string };
  /** Ảnh chứng từ. Khoá = attachmentId. */
  attachments: { key: string; value: Blob };
  /** Ảnh chờ đẩy lên máy chủ — riêng với hàng đợi op sổ. Khoá = attachmentId, giá trị = orgId. */
  attachmentQueue: { key: string; value: string };
  /** Mốc đồng bộ gần nhất theo tài khoản / tổ chức. */
  syncMarks: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<LocalDbSchema>> | null = null;

export const openLocalDb = (): Promise<IDBPDatabase<LocalDbSchema>> => {
  dbPromise ??= openDB<LocalDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books');
      if (!db.objectStoreNames.contains('attachments')) db.createObjectStore('attachments');
      if (!db.objectStoreNames.contains('attachmentQueue')) db.createObjectStore('attachmentQueue');
      if (!db.objectStoreNames.contains('syncMarks')) db.createObjectStore('syncMarks');
      if (!db.objectStoreNames.contains('cursors')) db.createObjectStore('cursors');

      if (!db.objectStoreNames.contains('legacyQueue')) db.createObjectStore('legacyQueue');
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' }).createIndex('seq', 'seq');
      } else {
        const queue = transaction.objectStore('queue');
        if (!queue.indexNames.contains('seq')) queue.createIndex('seq', 'seq');
        // Never infer an organization from the active session or a legacy user_id.
        void queue.openCursor().then(async function migrate(cursor): Promise<void> {
          if (!cursor) return;
          const op = cursor.value;
          if (!isScopedOp(op)) {
            await transaction.objectStore('legacyQueue').put(op, String(cursor.primaryKey));
            await cursor.delete();
          }
          await migrate(await cursor.continue());
        }).catch(() => transaction.abort());
      }
    },
    // Tab khác vừa mở bản app mới (DB_VERSION tăng): nhường kết nối, không thì tab mới treo chờ nâng cấp.
    blocking(_current, _blocked, event) {
      (event.target as IDBDatabase).close();
      dbPromise = null;
    },
  });
  return dbPromise;
};

const DEVICE_KEY = 'thumua365_device_id';

/** Máy chủ bắt `deviceId: z.uuid()` — sai định dạng thì MỌI lượt đẩy bị 422. */
const isDeviceId = (id: string | null): id is string => id !== null && z.uuid().safeParse(id).success;

/**
 * Sinh MỘT lần cho mỗi máy và lưu lại. `newId()` có dự phòng đúng định dạng UUID cho trình duyệt
 * không có `crypto.randomUUID` (Chrome Android < 92, iOS Safari < 15.4). Bản app cũ lưu `dev-…` ở
 * đúng trường hợp đó: sinh lại và ghi đè, không thì máy đó không bao giờ gửi được.
 */
export const getDeviceId = (): string => {
  let id: string | null = null;
  try {
    id = typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_KEY) : null;
  } catch {
    // Trình duyệt chặn lưu
  }
  if (!isDeviceId(id)) {
    id = newId();
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(DEVICE_KEY, id);
    } catch {
      // Trình duyệt chặn lưu
    }
  }
  return id;
};

export const readCursor = async (orgId: string): Promise<string | null> => {
  const db = await openLocalDb();
  return (await db.get('cursors', orgId)) ?? null;
};

export const writeCursor = async (orgId: string, cursor: string): Promise<void> => {
  const db = await openLocalDb();
  await db.put('cursors', cursor, orgId);
};

export const clearCursor = async (orgId: string): Promise<void> => {
  const db = await openLocalDb();
  await db.delete('cursors', orgId);
};
