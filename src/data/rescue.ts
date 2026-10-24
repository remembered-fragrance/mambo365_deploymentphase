/**
 * Cứu phiếu khi IndexedDB không ghi được nữa vì kết nối đã đóng (B7).
 *
 * Tab khác vừa mở bản app mới (DB_VERSION tăng): tab này nhường kết nối (`blocking` ở localDb.ts), và bản
 * app cũ không mở lại được DB đã nâng cấp. Phiếu vừa ghi đã hiện trên màn hình nhưng chưa vào hàng đợi —
 * tải lại là mất. Nên ghi tạm phần còn thiếu vào localStorage (không phụ thuộc phiên bản DB), bắt người
 * dùng tải lại, và lần mở sổ sau xếp lại vào hàng đợi (`drainRescued`).
 *
 * Chỉ giữ phần THAY ĐỔI của sổ, không giữ cả sổ: sổ lớn vượt hạn mức localStorage, và đè cả sổ lên sổ mà
 * tab bản mới đã ghi tiếp thì mất phần của tab đó.
 */

import { newId } from '@mambo/core/id';
import { emptyData, normalize, starterData } from '@mambo/core/normalize';
import type { AppData, AppSettings } from '@mambo/core/types';
import { readBook, writeBook } from './cache';
import { enqueue, type NewOp } from './queue';

const RESCUE_KEY = 'thumua365_rescue';

const COLLECTIONS = ['suppliers', 'buyers', 'products', 'transactions', 'drafts', 'notes', 'pricingRules', 'seasonContracts'] as const;
type Collection = (typeof COLLECTIONS)[number];
interface Row { readonly id: string }

export interface BookChanges {
  /** Bản ghi mới hoặc đã sửa — bản đầy đủ. */
  readonly changed: Partial<Record<Collection, readonly Row[]>>;
  /** Bản ghi đã rời sổ (nháp chốt thành phiếu, bản ghi máy chủ không nhận…). */
  readonly removed: Partial<Record<Collection, readonly string[]>>;
  readonly settings?: AppSettings;
}

export interface Rescued extends BookChanges {
  /** Khoá sổ (orgId, hoặc userId với sổ chỉ nằm trên máy). */
  readonly key: string;
  readonly orgId: string | null;
  /** Người ghi — op mang theo để chỉ được gửi bằng phiên của chính người này (B8). */
  readonly userId: string | null;
  /** opId cấp sẵn lúc cứu: xếp lại hai lần (hỏng giữa chừng rồi mở lại) vẫn là MỘT op, không thành hai phiếu. */
  readonly ops: readonly (NewOp & { readonly opId: string })[];
}

const rowsOf = (book: AppData, collection: Collection): readonly Row[] => (book[collection] ?? []) as readonly Row[];

/**
 * Những gì `next` khác `before`. Core thay object mỗi lần sửa một bản ghi, nên so object là đủ — không phải
 * so từng trường.
 */
export const bookChanges = (before: AppData, next: AppData): BookChanges => {
  const changed: Partial<Record<Collection, readonly Row[]>> = {};
  const removed: Partial<Record<Collection, readonly string[]>> = {};
  for (const collection of COLLECTIONS) {
    const old = new Map(rowsOf(before, collection).map((row) => [row.id, row]));
    const rows = rowsOf(next, collection);
    const fresh = rows.filter((row) => old.get(row.id) !== row);
    const kept = new Set(rows.map((row) => row.id));
    const gone = [...old.keys()].filter((id) => !kept.has(id));
    if (fresh.length > 0) changed[collection] = fresh;
    if (gone.length > 0) removed[collection] = gone;
  }
  return { changed, removed, ...(before.settings === next.settings ? {} : { settings: next.settings }) };
};

/** Áp phần thay đổi lên sổ đang có trên máy: bản ghi trùng id thay tại chỗ, bản ghi mới thêm vào. */
export const applyBookChanges = (book: AppData, changes: BookChanges): AppData => {
  let out: AppData = changes.settings ? { ...book, settings: changes.settings } : book;
  for (const collection of COLLECTIONS) {
    const gone = new Set(changes.removed[collection] ?? []);
    const fresh = new Map((changes.changed[collection] ?? []).map((row) => [row.id, row]));
    if (gone.size === 0 && fresh.size === 0) continue;
    const rows = rowsOf(out, collection)
      .filter((row) => !gone.has(row.id))
      .map((row) => fresh.get(row.id) ?? row);
    const present = new Set(rows.map((row) => row.id));
    const added = [...fresh.values()].filter((row) => !present.has(row.id));
    out = { ...out, [collection]: [...rows, ...added] };
  }
  // Danh sách phiếu luôn mới nhất trước, như sau mỗi lượt kéo (pullChanges.ts).
  return normalize({ ...out, transactions: [...out.transactions].sort((a, b) => b.date.localeCompare(a.date)) });
};

const readAll = (): Rescued[] => {
  try {
    const raw = localStorage.getItem(RESCUE_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as Rescued[]) : [];
  } catch {
    return [];
  }
};

const writeAll = (list: readonly Rescued[]): void => {
  if (list.length === 0) localStorage.removeItem(RESCUE_KEY);
  else localStorage.setItem(RESCUE_KEY, JSON.stringify(list));
};

/** Sổ `key` còn phần cất tạm chưa đưa vào máy (B7). */
export const hasRescued = (key: string): boolean => readAll().some((entry) => entry.key === key);

/** Ghi tạm một lần ghi hỏng. `false`: localStorage cũng không ghi được — phiếu chỉ còn trên màn hình. */
export const rescue = (entry: Omit<Rescued, 'ops'> & { readonly ops: readonly NewOp[] }): boolean => {
  try {
    writeAll([...readAll(), { ...entry, ops: entry.ops.map((op) => ({ ...op, opId: newId() })) }]);
    return true;
  } catch {
    return false;
  }
};

/**
 * Lần mở sổ `key` sau khi tải lại: xếp op đã cứu vào hàng đợi và áp phần thay đổi lên sổ. Xoá khỏi localStorage
 * SAU khi ghi xong — hỏng giữa chừng thì lần mở sau làm lại (opId cấp sẵn nên không thành hai op).
 */
export const drainRescued = async (key: string): Promise<number> => {
  const mine = readAll().filter((entry) => entry.key === key);
  if (mine.length === 0) return 0;
  let book = await readBook(key);
  for (const entry of mine) {
    for (const { opId, ...op } of entry.ops) {
      // Không có người ghi (sổ chỉ nằm trên máy thì không có op) — không đoán, op không được gửi bằng phiên ai khác.
      if (entry.orgId && entry.userId) await enqueue({ ...op, orgId: entry.orgId, userId: entry.userId }, opId);
    }
    book = applyBookChanges(book ?? (entry.orgId ? emptyData() : starterData()), entry);
  }
  if (book) await writeBook(key, book);
  writeAll(readAll().filter((entry) => entry.key !== key));
  return mine.length;
};

/** Dọn tổ chức khỏi máy (đăng xuất, bị gỡ): phần cứu tạm của sổ đó cũng là dữ liệu của tổ chức. */
export const forgetRescued = (key: string): void => {
  try {
    writeAll(readAll().filter((entry) => entry.key !== key));
  } catch {
    // Trình duyệt chặn lưu: không có gì để dọn.
  }
};
