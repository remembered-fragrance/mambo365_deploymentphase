/**
 * Kết nối IndexedDB dùng chung và hình dạng của bốn kho cục bộ.
 *
 * Tách riêng khỏi `cache.ts` / `queue.ts` / `attachments.ts` để ba file đó
 * không phải import lẫn nhau chỉ vì cùng dùng một kết nối.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TableName } from './rows';

const DB_NAME = 'thumua365';
const DB_VERSION = 2;

export type OpKind = 'insert' | 'update' | 'softDelete';

/** Một thao tác ghi đang chờ đẩy lên máy chủ. */
export interface QueuedOp {
  /** Owner captured at enqueue time; never inferred from the next login session. */
  readonly userId?: string;
  /** Khoá chống trùng: bấm hai lần vì mạng chậm không thành hai phiếu. */
  readonly id: string;
  readonly kind: OpKind;
  readonly table: TableName;
  /** Hàng đã map sang snake_case. Với softDelete chỉ cần biết `recordId`. */
  readonly payload: Record<string, unknown>;
  /** Bản ghi nghiệp vụ bị chạm — dùng để gắn cờ "đang chờ gửi" lên phiếu. */
  readonly recordId: string;
  /**
   * Số thứ tự tăng dần — khoá sắp xếp của hàng đợi.
   *
   * 🔴 KHÔNG dùng `createdAt` để sắp: một lần bấm "Trả đủ & xong" xếp bốn thao
   * tác trong cùng một mili giây, và khi mốc thời gian bằng nhau thì IndexedDB
   * trả về theo khoá chính (uuid ngẫu nhiên). Lần trả tiền có thể lên trước
   * phiếu → khoá ngoại lỗi và khoản tiền rơi mất.
   */
  readonly seq: number;
  readonly createdAt: string;
  readonly tries: number;
  readonly nextAttemptAt: string;
  readonly lastError?: string;
  readonly attemptedAt?: string;
}

interface LocalDbSchema extends DBSchema {
  /** Sổ của từng tài khoản. Khoá = userId. */
  books: { key: string; value: unknown };
  queue: { key: string; value: QueuedOp; indexes: { seq: number } };
  /** Ảnh chứng từ. Khoá = attachmentId. */
  attachments: { key: string; value: Blob };
  /** Mốc đồng bộ gần nhất theo tài khoản. Khoá = userId. */
  syncMarks: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<LocalDbSchema>> | null = null;

export const openLocalDb = (): Promise<IDBPDatabase<LocalDbSchema>> => {
  dbPromise ??= openDB<LocalDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books');
      if (!db.objectStoreNames.contains('attachments')) db.createObjectStore('attachments');
      if (!db.objectStoreNames.contains('syncMarks')) db.createObjectStore('syncMarks');

      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' }).createIndex('seq', 'seq');
      } else {
        const queue = transaction.objectStore('queue');
        if (!queue.indexNames.contains('seq')) queue.createIndex('seq', 'seq');
        // Preserve unsent v1 operations. Unknown owners remain quarantined.
        void (async () => {
          let cursor = await queue.openCursor();
          let sequence = 0;
          while (cursor) {
            const row = cursor.value;
            const created = Date.parse(row.createdAt);
            sequence = Math.max(sequence + 1, Number.isFinite(created) ? created * 1000 : 1);
            await cursor.update({ ...row, seq: row.seq ?? sequence });
            cursor = await cursor.continue();
          }
        })();
      }
    },
  });
  return dbPromise;
};

let lastSeq = 0;

/**
 * Số thứ tự tăng dần, không bao giờ lặp trong một phiên và vẫn tăng qua các
 * lần mở app (phần nguyên là mốc thời gian).
 */
export const nextSeq = (): number => {
  const now = Date.now() * 1_000;
  lastSeq = now > lastSeq ? now : lastSeq + 1;
  return lastSeq;
};
