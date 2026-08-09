/**
 * Kết nối IndexedDB dùng chung và hình dạng của bốn kho cục bộ.
 *
 * Tách riêng khỏi `cache.ts` / `queue.ts` / `attachments.ts` để ba file đó
 * không phải import lẫn nhau chỉ vì cùng dùng một kết nối.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TableName } from './rows';

const DB_NAME = 'thumua365';
const DB_VERSION = 1;

export type OpKind = 'insert' | 'update' | 'softDelete';

/** Một thao tác ghi đang chờ đẩy lên máy chủ. */
export interface QueuedOp {
  /** Khoá chống trùng: bấm hai lần vì mạng chậm không thành hai phiếu. */
  readonly id: string;
  readonly kind: OpKind;
  readonly table: TableName;
  /** Hàng đã map sang snake_case. Với softDelete chỉ cần biết `recordId`. */
  readonly payload: Record<string, unknown>;
  /** Bản ghi nghiệp vụ bị chạm — dùng để gắn cờ "đang chờ gửi" lên phiếu. */
  readonly recordId: string;
  readonly createdAt: string;
  readonly tries: number;
  readonly nextAttemptAt: string;
  readonly lastError?: string;
}

interface LocalDbSchema extends DBSchema {
  /** Sổ của từng tài khoản. Khoá = userId. */
  books: { key: string; value: unknown };
  queue: { key: string; value: QueuedOp; indexes: { createdAt: string } };
  /** Ảnh chứng từ. Khoá = attachmentId. */
  attachments: { key: string; value: Blob };
  /** Mốc đồng bộ gần nhất theo tài khoản. Khoá = userId. */
  syncMarks: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<LocalDbSchema>> | null = null;

export const openLocalDb = (): Promise<IDBPDatabase<LocalDbSchema>> => {
  dbPromise ??= openDB<LocalDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('books');
      db.createObjectStore('queue', { keyPath: 'id' }).createIndex('createdAt', 'createdAt');
      db.createObjectStore('attachments');
      db.createObjectStore('syncMarks');
    },
  });
  return dbPromise;
};
