import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { emptyData } from '@mambo/core/normalize';

const NO_CHANGES = { suppliers: [], buyers: [], products: [], transactions: [], payments: [], drafts: [], pricingRules: [], notes: [] };
const pull = vi.fn().mockResolvedValue({ changes: NO_CHANGES, cursor: 'c-1', hasMore: false });
vi.mock('@/data/client', () => ({ apiForOrg: () => ({ sync: { pull, push: vi.fn() } }) }));

const { syncOnce } = await import('@/data/sync');
const { readCursor } = await import('@/data/localDb');

describe('syncOnce — con trỏ đi cùng sổ, store mới là nơi ghi', () => {
  it('trả con trỏ mới nhưng không tự ghi — kết quả bị bỏ thì lần sau kéo lại đúng trang đó', async () => {
    const outcome = await syncOnce(null, 'org-a', emptyData());
    expect(outcome.cursor).toBe('c-1');
    expect(await readCursor('org-a')).toBeNull();
  });
});
