import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { emptyData } from '@mambo/core/normalize';
import { ApiError } from '@mambo/sdk';
import type { AppData } from '@mambo/core/types';

const NO_CHANGES = { suppliers: [], buyers: [], products: [], transactions: [], payments: [], drafts: [], pricingRules: [], notes: [] };
const pull = vi.fn().mockResolvedValue({ changes: NO_CHANGES, cursor: 'c-1', hasMore: false });
const push = vi.fn();
vi.mock('@/data/client', () => ({ apiForOrg: () => ({ sync: { pull, push } }) }));

const { rebasePulled, syncOnce } = await import('@/data/sync');
const { openLocalDb, readCursor, writeCursor } = await import('@/data/localDb');
const { readSyncMark } = await import('@/data/cache');
const { enqueue, opInsert } = await import('@/data/queue');

describe('syncOnce — con trỏ đi cùng sổ, store mới là nơi ghi', () => {
  it('trả con trỏ mới nhưng không tự ghi — kết quả bị bỏ thì lần sau kéo lại đúng trang đó', async () => {
    const outcome = await syncOnce(null, 'org-a', 'u-1', emptyData());
    expect(outcome.cursor).toBe('c-1');
    expect(await readCursor('org-a')).toBeNull();
  });
});

describe('con trỏ do app bản cũ ghi', () => {
  it('không còn đọc: máy kéo lại từ đầu một lần để nhận loại bản ghi / trường bản cũ đã bỏ qua', async () => {
    const db = await openLocalDb();
    await db.put('cursors', 'cu-cua-ban-cu', 'org-cu');
    expect(await readCursor('org-cu')).toBeNull();

    pull.mockClear();
    await syncOnce(null, 'org-cu', 'u-1', emptyData());
    expect(pull).toHaveBeenCalledWith({});

    await writeCursor('org-cu', 'c-moi');
    expect(await readCursor('org-cu')).toBe('c-moi');
  });
});

describe('rebasePulled — gộp phần kéo về vào sổ mới nhất', () => {
  const supplier = (id: string) => ({ id, name: id }) as unknown as AppData['suppliers'][number];
  const deleted = (id: string) => ({ id, deletedAt: '2026-10-17T00:00:00.000Z' });
  const page = (suppliers: unknown[]) => ({ ...NO_CHANGES, suppliers }) as never;

  it('phiếu / đối tác ghi xen vào trong lúc kéo vẫn còn, thay đổi máy chủ vẫn vào', () => {
    const latest = { ...emptyData(), suppliers: [supplier('cu'), supplier('moi-ghi')] };
    const book = rebasePulled(latest, { reset: false, pages: [page([deleted('cu')])] }, new Set(['moi-ghi']));
    expect(book?.suppliers.map((s) => s.id)).toEqual(['moi-ghi']);
  });

  it('bản ghi còn thao tác chưa gửi giữ bản trên máy', () => {
    const latest = { ...emptyData(), suppliers: [supplier('dang-sua')] };
    const book = rebasePulled(latest, { reset: false, pages: [page([deleted('dang-sua')])] }, new Set(['dang-sua']));
    expect(book?.suppliers.map((s) => s.id)).toEqual(['dang-sua']);
  });

  it('máy chủ bảo dựng lại sổ mà còn thao tác chưa gửi thì để lượt sau', () => {
    expect(rebasePulled(emptyData(), { reset: true, pages: [] }, new Set(['x']))).toBeNull();
    expect(rebasePulled({ ...emptyData(), suppliers: [supplier('a')] }, { reset: true, pages: [] }, new Set())?.suppliers).toEqual([]);
  });
});

describe('syncOnce không tự ghi mốc "đã đồng bộ"', () => {
  it('trả mốc để store ghi khi thật sự lưu kết quả', async () => {
    const outcome = await syncOnce(null, 'org-mark', 'u-1', emptyData());
    expect(outcome.syncedAt).toBeTruthy();
    expect(await readSyncMark('org-mark')).toBeNull();
  });
});

describe('gói hết hạn', () => {
  it('chưa gửi lên được nhưng vẫn kéo thay đổi từ máy khác về', async () => {
    await enqueue({ ...opInsert('note', 'n-1', {}), orgId: 'org-expired', userId: 'u-1' });
    push.mockRejectedValueOnce(new ApiError('PLAN_EXPIRED', 403, 'Hết gói'));
    pull.mockClear();
    const outcome = await syncOnce(null, 'org-expired', 'u-1', emptyData());
    expect(pull).toHaveBeenCalled();
    expect(outcome.status).toMatchObject({ blocked: true, pendingCount: 1 });
    expect(outcome.cursor).toBe('c-1');
  });
});
