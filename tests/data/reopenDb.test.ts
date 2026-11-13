// @vitest-environment jsdom
/**
 * B7: tab khác mở bản app mới (DB_VERSION tăng) thì tab này phải nhường kết nối IndexedDB. Ghi dở lúc đó không
 * được mất: mở lại được thì ghi tiếp, không được thì cứu vào localStorage và xếp lại khi mở sổ lần sau.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyData } from '@mambo/core/normalize';
import type { AppData, Supplier } from '@mambo/core/types';
import { readBook, writeBook } from '@/data/cache';
import { isClosedDb, openLocalDb, withReopen } from '@/data/localDb';
import { opInsert, pendingOps } from '@/data/queue';
import { applyBookChanges, bookChanges, drainRescued, rescue } from '@/data/rescue';

const DB = 'thumua365';

const request = <T>(req: IDBRequest<T> | IDBOpenDBRequest): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });

/** "Tab khác" xoá DB: kết nối của tab này nhận `versionchange`, nhường (`blocking`) rồi DB mới được tạo lại. */
const otherTabDeletes = () => request(indexedDB.deleteDatabase(DB));

/** "Tab khác" mở bản app mới hơn: DB lên bản 99, bản app này không mở lại được nữa. */
const otherTabUpgrades = async (): Promise<IDBDatabase> => request<IDBDatabase>(indexedDB.open(DB, 99));

const supplier = (id: string, name: string): Supplier => ({ id, name, createdAt: '2026-10-19T00:00:00.000Z' }) as Supplier;

beforeEach(async () => {
  localStorage.clear();
  await otherTabDeletes();
});

describe('kết nối IndexedDB bị đóng giữa chừng', () => {
  it('🔴 ghi bằng kết nối đã bị nhường: mở lại DB rồi ghi được (không báo lỗi oan)', async () => {
    const stale = await openLocalDb();
    await otherTabDeletes();
    let attempts = 0;
    await withReopen(async () => {
      attempts++;
      // Lần đầu dùng kết nối cũ (như `enqueue` đã lấy kết nối ngay trước khi tab kia chen vào).
      const db = attempts === 1 ? stale : await openLocalDb();
      await db.put('books', emptyData(), 'org-a');
    });
    expect(attempts).toBe(2);
    expect(await readBook('org-a')).not.toBeNull();
  });

  it('🔴 mở hỏng một lần (DB đã lên bản mới) không bị nhớ mãi: DB mở được lại thì dùng được', async () => {
    await openLocalDb();
    const newer = await otherTabUpgrades();
    const failure = await openLocalDb().then(() => null, (error: unknown) => error);
    expect(isClosedDb(failure)).toBe(true);
    newer.close();
    await otherTabDeletes();
    await expect(openLocalDb()).resolves.toBeTruthy();
  });

  it('DB đã lên bản mới: chạy lại cũng không mở được — lỗi vẫn là lỗi "kết nối đóng" để store cứu phiếu', async () => {
    await openLocalDb();
    const newer = await otherTabUpgrades();
    const error = await withReopen(() => writeBook('org-a', emptyData())).then(() => null, (e: unknown) => e);
    expect(isClosedDb(error)).toBe(true);
    newer.close();
  });
});

describe('cứu phiếu qua localStorage rồi xếp lại', () => {
  it('chỉ giữ phần thay đổi; áp lên sổ mới nhất không đè phần tab khác đã ghi', () => {
    const before: AppData = { ...emptyData(), suppliers: [supplier('s-1', 'Chú Bảy')] };
    const next: AppData = { ...before, suppliers: [supplier('s-1', 'Chú Bảy Lúa'), supplier('s-2', 'Cô Mai')] };
    const changes = bookChanges(before, next);
    expect(changes.changed.suppliers?.map((s) => s.id)).toEqual(['s-1', 's-2']);
    // Sổ trên máy đã có thêm đối tác tab bản mới vừa ghi.
    const onDisk: AppData = { ...emptyData(), suppliers: [supplier('s-1', 'Chú Bảy'), supplier('s-9', 'Tab mới')] };
    expect(applyBookChanges(onDisk, changes).suppliers.map((s) => s.name)).toEqual(['Chú Bảy Lúa', 'Tab mới', 'Cô Mai']);
  });

  it('mở sổ lần sau: op đã cứu vào hàng đợi đúng MỘT lần, sổ có lại bản ghi', async () => {
    const before = emptyData();
    const next: AppData = { ...before, suppliers: [supplier('s-2', 'Cô Mai')] };
    expect(rescue({
      key: 'org-a', orgId: 'org-a', userId: 'u-1', ops: [opInsert('supplier', 's-2', { name: 'Cô Mai' })], ...bookChanges(before, next),
    })).toBe(true);

    expect(await drainRescued('org-a')).toBe(1);
    expect(await drainRescued('org-a')).toBe(0);
    const ops = await pendingOps('org-a');
    expect(ops.map((op) => [op.recordId, op.userId])).toEqual([['s-2', 'u-1']]);
    expect((await readBook('org-a'))?.suppliers.map((s) => s.name)).toEqual(['Cô Mai']);
    expect(localStorage.getItem('thumua365_rescue')).toBeNull();
  });

  it('sổ khác không bị xếp nhầm: chỉ lấy phần cứu của đúng khoá sổ', async () => {
    rescue({ key: 'org-b', orgId: 'org-b', userId: 'u-1', ops: [opInsert('note', 'n-1', {})], changed: {}, removed: {} });
    expect(await drainRescued('org-a')).toBe(0);
    expect(await pendingOps('org-b')).toEqual([]);
    expect(await drainRescued('org-b')).toBe(1);
    expect(await pendingOps('org-b')).toHaveLength(1);
  });
});
