// @vitest-environment jsdom
/**
 * B7 qua store thật: tab khác mở bản app mới (DB lên bản mới hơn) đúng lúc tab này ghi phiếu. Phiếu không được
 * mất khi tải lại: cứu vào localStorage, chặn màn hình bằng "Tải lại app để lưu", phiếu vẫn trên màn hình.
 * File riêng: DB bị nâng bản ở đây thì các test khác dùng chung DB không mở được nữa.
 */

import 'fake-indexeddb/auto';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Me } from '@mambo/contracts';
import type { StoreValue } from '@/data/useStore';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
const NO_CHANGES = { suppliers: [], buyers: [], products: [], transactions: [], payments: [], drafts: [], pricingRules: [], notes: [] };

const net = vi.hoisted(() => ({ pull: vi.fn(), push: vi.fn() }));

vi.mock('@/data/client', () => {
  let current: string | null = null;
  const supabase = { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: USER } } } }) } };
  return {
    getSupabase: () => supabase,
    hasBackend: () => true,
    setCurrentOrg: (id: string | null) => { current = id; },
    getCurrentOrgId: () => current,
    api: { account: { profile: () => Promise.reject(new Error('offline')) } },
    apiForOrg: () => ({ sync: net }),
  };
});

const me = (): Me => ({
  user: { id: USER, name: 'Hùng', phone: '+84912345678', email: null, phoneVerified: false },
  memberships: [{
    organization: { id: ORG, name: 'Vựa Hùng', type: 'trader' },
    role: 'owner',
    branch: null,
    permissions: ['book:sync'],
    features: [],
    plan: { tier: 'trial', status: 'trialing', periodEnd: null, branchLimit: null },
  }],
  pendingLinks: 0,
});

vi.mock('@/data/auth', () => ({
  getMe: () => Promise.resolve(me()),
  profileFromMe: (m: Me) => ({ id: m.user.id, name: m.user.name }),
  profileFromAccount: (u: { id: string }) => ({ id: u.id, name: '' }),
  signOut: () => Promise.resolve(),
}));

const { StoreProvider } = await import('@/data/store');
const { useStore } = await import('@/data/useStore');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let store: StoreValue;
let root: Root;
function Probe() {
  store = useStore();
  return null;
}

const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 5)));
const until = async (ready: () => boolean, what: string) => {
  for (let i = 0; i < 200; i++) {
    if (ready()) return;
    await tick();
  }
  throw new Error(`Hết giờ chờ: ${what}`);
};

beforeEach(async () => {
  localStorage.clear();
  net.pull.mockReset().mockResolvedValue({ changes: NO_CHANGES, cursor: 'c-0', hasMore: false });
  // Mất mạng: op nằm lại hàng đợi, đúng lúc người dùng cần nó nhất.
  net.push.mockReset().mockRejectedValue(new TypeError('Failed to fetch'));
  root = createRoot(document.createElement('div'));
  await act(async () => { root.render(createElement(StoreProvider, null, createElement(Probe))); });
  await until(() => store.currentOrgId === ORG && !store.status.loading, 'vào sổ');
});

afterEach(() => {
  act(() => root.unmount());
});

/** Tab bản mới nâng DB: tab này nhận `versionchange`, nhường kết nối, và không mở lại được bằng bản cũ. */
const openNewerTab = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open('thumua365', 99);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('open failed'));
});

describe('tab khác mở bản app mới lúc đang đồng bộ (B7)', () => {
  it('🔴 không báo "mất mạng": chặn màn hình bảo tải lại, không có gì dở dang', async () => {
    // Sổ đã nạp xong, lượt đồng bộ đầu đã chạy: lỗi lần này chỉ có thể đến từ lượt đồng bộ sau.
    for (let i = 0; i < 10; i++) await tick();
    const newer = await openNewerTab();
    act(() => { store.syncNow(); });
    await until(() => store.reloadRequired !== null, 'báo phải tải lại');
    expect(store.reloadRequired).toBe('idle');
    expect(store.status.error).toBeUndefined();
    newer.close();
    // Trả DB về như mới cho test sau (bản cũ mở lại được).
    await new Promise<void>((resolve) => { const req = indexedDB.deleteDatabase('thumua365'); req.onsuccess = () => resolve(); });
  });
});

describe('tab khác mở bản app mới lúc đang ghi phiếu (B7)', () => {
  it('🔴 phiếu không mất: cứu vào localStorage, bắt tải lại, phiếu vẫn trên màn hình', async () => {
    const newer = await openNewerTab();

    act(() => { store.addSupplier({ name: 'Cô Mai (ghi lúc tab kia nâng cấp)' }); });
    await until(() => store.reloadRequired !== null, 'báo phải tải lại');

    expect(store.reloadRequired).toBe('saved');
    expect(store.data.suppliers.map((s) => s.name)).toContain('Cô Mai (ghi lúc tab kia nâng cấp)');
    const rescued = JSON.parse(localStorage.getItem('thumua365_rescue') ?? '[]') as {
      key: string; orgId: string; userId: string; ops: { entity: string; opId: string }[]; changed: { suppliers?: { name: string }[] };
    }[];
    expect(rescued).toHaveLength(1);
    expect(rescued[0]).toMatchObject({ key: ORG, orgId: ORG, userId: USER });
    expect(rescued[0]?.ops.map((op) => op.entity)).toEqual(['supplier']);
    expect(rescued[0]?.changed.suppliers?.map((s) => s.name)).toEqual(['Cô Mai (ghi lúc tab kia nâng cấp)']);
    newer.close();
  });
});
