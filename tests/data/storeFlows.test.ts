// @vitest-environment jsdom
/**
 * Store chạy thật (React + IndexedDB + hàng đợi + syncOnce), chỉ giả mạng: ba luồng dễ làm mất dữ
 * liệu nhất mà unit test từng hàm không bắt được vì lỗi nằm ở chỗ nối giữa chúng.
 */

import 'fake-indexeddb/auto';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Me } from '@mambo/contracts';
import type { StoreValue } from '@/data/useStore';

const USER = '11111111-1111-4111-8111-111111111111';
/** Mỗi test một tổ chức mới: sổ, hàng đợi, con trỏ của test trước không lọt sang. */
let ORG = '';
const SERVER_SUPPLIER = '33333333-3333-4333-8333-333333333333';
const NO_CHANGES = { suppliers: [], buyers: [], products: [], transactions: [], payments: [], drafts: [], pricingRules: [], notes: [] };

interface WireOp { readonly opId: string; readonly recordId: string; readonly kind: string }
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
const { useStore, UnsentOpsError } = await import('@/data/useStore');
const { pendingOps } = await import('@/data/queue');
const { readBook } = await import('@/data/cache');
const { readCursor } = await import('@/data/localDb');
const { useDemoMode } = await import('@/data/hooks/useDemoMode');
const { L } = await import('@/i18n/labels');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let store: StoreValue;
let demo: ReturnType<typeof useDemoMode>;
let root: Root;
function Probe() {
  store = useStore();
  demo = useDemoMode();
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
/** Đợi store hết việc: không còn op chờ gửi trong máy, không còn lượt kéo nào đang treo. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await tick();
};

const applied = ({ ops }: { ops: WireOp[] }) => Promise.resolve({ results: ops.map((op) => ({ opId: op.opId, status: 'applied' })) });
const nothingNew = ({ cursor }: { cursor?: string } = {}) => Promise.resolve({ changes: NO_CHANGES, cursor: cursor ?? 'c-0', hasMore: false });
const supplierRow = (id: string, name: string) => ({
  id, name, phone: null, location: null, note: null,
  user_id: USER, created_at: '2026-10-18T00:00:00.000Z', updated_at: '2026-10-18T00:00:00.000Z', deleted_at: null,
});

beforeEach(async () => {
  ORG = crypto.randomUUID();
  localStorage.clear();
  net.pull.mockReset().mockImplementation(nothingNew);
  net.push.mockReset().mockImplementation(applied);
  root = createRoot(document.createElement('div'));
  await act(async () => { root.render(createElement(StoreProvider, null, createElement(Probe))); });
  await until(() => store.currentOrgId === ORG && !store.status.loading, 'vào sổ');
  await settle();
});

afterEach(() => {
  act(() => root.unmount());
});

describe('ghi trong lúc đang kéo về', () => {
  it('đối tác vừa ghi và đối tác máy chủ trả về đều còn — trên màn hình lẫn trong máy', async () => {
    let release: (value: unknown) => void = () => undefined;
    net.pull.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    act(() => store.syncNow());
    await until(() => net.pull.mock.calls.length >= 2, 'lượt kéo bắt đầu');

    let local = '';
    act(() => { local = store.addSupplier({ name: 'Cô Mai (ghi lúc đang kéo)' }).id; });
    await tick();
    release({ changes: { ...NO_CHANGES, suppliers: [supplierRow(SERVER_SUPPLIER, 'Chú Bảy (máy chủ)')] }, cursor: 'c-1', hasMore: false });
    await until(() => store.data.suppliers.some((s) => s.id === SERVER_SUPPLIER), 'gộp phần kéo về');
    await settle();

    expect(store.data.suppliers.map((s) => s.id).sort()).toEqual([local, SERVER_SUPPLIER].sort());
    expect((await readBook(ORG))?.suppliers.map((s) => s.id).sort()).toEqual([local, SERVER_SUPPLIER].sort());
    // Lượt chạy thêm (gọi đồng bộ lúc đang chạy) đã đẩy op của đối tác mới lên.
    expect(net.push.mock.calls.flatMap(([body]) => (body as { ops: WireOp[] }).ops.map((op) => op.recordId))).toContain(local);
    expect(await pendingOps(ORG)).toHaveLength(0);
    expect(await readCursor(ORG)).toBe('c-1');
  });

  it('lượt kéo bắt đầu trước khi xoá hết sổ không được đổ dữ liệu cũ vào sổ mới', async () => {
    let release: (value: unknown) => void = () => undefined;
    net.pull.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    act(() => store.syncNow());
    await until(() => net.pull.mock.calls.length >= 2, 'lượt kéo bắt đầu');

    act(() => store.reset());
    release({ changes: { ...NO_CHANGES, suppliers: [supplierRow(SERVER_SUPPLIER, 'Dữ liệu của lượt cũ')] }, cursor: 'c-cu', hasMore: false });
    await settle();

    expect(store.data.suppliers).toEqual([]);
    expect(await readCursor(ORG)).not.toBe('c-cu');
  });
});

describe('đăng xuất khi còn thao tác chưa gửi', () => {
  it('hỏi lại trước khi bỏ; từ chối thì sổ vẫn ghi được; đồng ý thì dọn sạch máy', async () => {
    net.push.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    act(() => { store.addSupplier({ name: 'Chưa gửi được' }); });
    await settle();
    expect(await pendingOps(ORG)).toHaveLength(1);

    let refused: unknown;
    await act(async () => { await store.signOut().catch((error: unknown) => { refused = error; }); });
    expect(refused).toBeInstanceOf(UnsentOpsError);
    expect((refused as InstanceType<typeof UnsentOpsError>).count).toBe(1);
    // Không đăng xuất ⇒ sổ không được khoá lại.
    expect(() => act(() => { store.addSupplier({ name: 'Ghi tiếp sau khi huỷ' }); })).not.toThrow();
    await settle();
    expect(await pendingOps(ORG)).toHaveLength(2);

    await act(async () => { await store.signOut({ discardUnsent: true }); });
    expect(store.user).toBeNull();
    expect(await pendingOps(ORG)).toHaveLength(0);
    expect(await readBook(ORG)).toBeNull();
  });

  it('gói hết hạn (máy chủ chặn ghi) vẫn đăng xuất được sau khi xác nhận', async () => {
    net.push.mockImplementation(({ ops }: { ops: WireOp[] }) => Promise.resolve({
      results: [{ opId: ops[0]?.opId, status: 'rejected', error: { code: 'PLAN_EXPIRED', message: 'Gói hết hạn' } }],
    }));
    act(() => { store.addSupplier({ name: 'Ghi sau khi hết gói' }); });
    await until(() => Boolean(store.status.blocked), 'máy chủ báo hết gói');
    expect(store.syncsWithServer).toBe(false);

    await act(async () => { await expect(store.signOut()).rejects.toBeInstanceOf(UnsentOpsError); });
    await act(async () => { await store.signOut({ discardUnsent: true }); });
    expect(store.user).toBeNull();
  });
});

describe('bỏ thao tác bị máy chủ từ chối', () => {
  it('thêm mới bị từ chối: bỏ luôn các sửa sau đó của cùng bản ghi và gỡ bản ghi khỏi sổ', async () => {
    net.push.mockImplementation(({ ops }: { ops: WireOp[] }) => Promise.resolve({
      results: [{ opId: ops[0]?.opId, status: 'rejected', error: { code: 'VALIDATION_FAILED', message: 'Sai dữ liệu' } }],
    }));
    let id = '';
    act(() => { id = store.addSupplier({ name: 'Bị từ chối' }).id; });
    await until(() => store.stuck, 'banner kẹt');
    act(() => store.updateSupplier(id, { name: 'Sửa sau khi kẹt' }));
    await settle();
    expect(await pendingOps(ORG)).toHaveLength(2);

    net.push.mockClear().mockImplementation(applied);
    act(() => store.dropStuck());
    await until(() => !store.data.suppliers.some((s) => s.id === id), 'gỡ bản ghi');
    await settle();

    // Bản sửa của bản ghi máy chủ không có thì không được gửi lên — gửi là máy chủ từ chối tiếp, kẹt lại.
    expect(net.push.mock.calls.flatMap(([body]) => (body as { ops: WireOp[] }).ops.map((op) => op.recordId))).not.toContain(id);
    expect(store.stuck).toBe(false);
    expect(await pendingOps(ORG)).toHaveLength(0);
    expect((await readBook(ORG))?.suppliers.some((s) => s.id === id)).toBe(false);
  });

  it('bấm Gửi lại thì gửi lại đúng thao tác đó và tắt banner', async () => {
    net.push.mockImplementation(({ ops }: { ops: WireOp[] }) => Promise.resolve({
      results: [{ opId: ops[0]?.opId, status: 'rejected', error: { code: 'VALIDATION_FAILED', message: 'Sai dữ liệu' } }],
    }));
    let id = '';
    act(() => { id = store.addSupplier({ name: 'Gửi lại được' }).id; });
    await until(() => store.stuck, 'banner kẹt');

    net.push.mockImplementation(applied);
    act(() => store.retryStuck());
    await until(() => !store.stuck, 'tắt banner');
    await settle();

    expect(await pendingOps(ORG)).toHaveLength(0);
    expect(store.data.suppliers.some((s) => s.id === id)).toBe(true);
  });
});

describe('dữ liệu mẫu và nạp file trên sổ đang đồng bộ', () => {
  it('nạp file bị từ chối: máy chủ và máy khác không có sổ đó', async () => {
    expect(store.syncsWithServer).toBe(true);
    expect(() => store.importData({ suppliers: [{ id: SERVER_SUPPLIER, name: 'Từ file' }] })).toThrow(L.importWhileSyncing);
    expect(store.data.suppliers).toEqual([]);
  });

  it('ghi trên dữ liệu mẫu không lên máy chủ; tắt mẫu thì sổ thật kéo về lại từ đầu', async () => {
    // Đã có `c-full` = đã kéo trọn sổ; không có con trỏ (hoặc con trỏ cũ) = trả cả sổ.
    net.pull.mockImplementation(({ cursor }: { cursor?: string } = {}) => Promise.resolve(cursor === 'c-full'
      ? { changes: NO_CHANGES, cursor, hasMore: false }
      : { changes: { ...NO_CHANGES, suppliers: [supplierRow(SERVER_SUPPLIER, 'Chú Bảy (sổ thật)')] }, cursor: 'c-full', hasMore: false }));
    act(() => store.syncNow());
    await until(() => store.data.suppliers.some((s) => s.id === SERVER_SUPPLIER), 'sổ thật về');
    await settle();

    act(() => demo.startDemo());
    await settle();
    expect(demo.demo).toBe(true);
    expect(store.data.suppliers.some((s) => s.id === SERVER_SUPPLIER)).toBe(false);
    act(() => { store.addSupplier({ name: 'Đối tác mẫu' }); });
    await settle();
    expect(await pendingOps(ORG)).toHaveLength(0);

    net.push.mockClear();
    act(() => demo.endDemo());
    await until(() => store.data.suppliers.some((s) => s.id === SERVER_SUPPLIER), 'sổ thật về lại');
    await settle();

    expect(demo.demo).toBe(false);
    expect(store.data.suppliers.map((s) => s.id)).toEqual([SERVER_SUPPLIER]);
    expect(net.push).not.toHaveBeenCalled();
    expect((await readBook(ORG))?.suppliers.map((s) => s.id)).toEqual([SERVER_SUPPLIER]);
  });
});
