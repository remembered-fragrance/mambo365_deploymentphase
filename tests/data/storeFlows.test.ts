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

/** Tổ chức đã gỡ người dùng: `/v1/me` không còn kể (B8). */
const removedFrom = new Set<string>();
const me = (): Me => ({
  user: { id: USER, name: 'Hùng', phone: '+84912345678', email: null, phoneVerified: false },
  memberships: removedFrom.has(ORG) ? [] : [{
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
const { putLocalAttachment, queueAttachmentUpload } = await import('@/data/attachments');
const { ApiError } = await import('@mambo/sdk');
const { readBook } = await import('@/data/cache');
const { openLocalDb, readCursor } = await import('@/data/localDb');
const { useDemoMode } = await import('@/data/hooks/useDemoMode');
const { L } = await import('@/i18n/labels');
const { emptyData } = await import('@mambo/core/normalize');
const { enqueue } = await import('@/data/queue');

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
  removedFrom.clear();
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

describe('bị gỡ khỏi tổ chức (B8)', () => {
  const offline = () => net.push.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));

  it('🔴 đăng xuất sau khi bị gỡ: sổ, hàng đợi và ảnh của tổ chức cũ bị dọn khỏi máy', async () => {
    offline();
    act(() => { store.addSupplier({ name: 'Ghi lúc mất mạng' }); });
    await settle();
    await putLocalAttachment('photo-x', new Blob(['x'], { type: 'image/jpeg' }));
    await queueAttachmentUpload('photo-x', ORG, USER);
    expect(await pendingOps(ORG)).toHaveLength(1);

    removedFrom.add(ORG);
    await act(async () => { await store.refreshMe(); });
    await settle();
    // Còn op chưa gửi: báo kèm số lượng, sổ giữ lại để còn xuất file.
    expect(store.leftOrgs).toEqual([{ id: ORG, name: 'Vựa Hùng', unsent: 1 }]);
    expect(await readBook(ORG)).not.toBeNull();

    let refused: unknown;
    await act(async () => { await store.signOut().catch((error: unknown) => { refused = error; }); });
    // Một op + một ảnh chưa lên máy chủ.
    expect((refused as InstanceType<typeof UnsentOpsError>).count).toBe(2);
    await act(async () => { await store.signOut({ discardUnsent: true }); });
    const db = await openLocalDb();
    expect(await readBook(ORG)).toBeNull();
    expect(await pendingOps(ORG)).toEqual([]);
    expect(await db.getAll('legacyQueue')).toEqual([]);
    expect(await db.get('attachments', 'photo-x')).toBeUndefined();
    expect(await db.get('attachmentQueue', 'photo-x')).toBeUndefined();
  });

  it('🔴 đăng xuất khi chỉ còn ảnh chưa lên máy chủ: hỏi trước, không lặng lẽ xoá ảnh', async () => {
    await putLocalAttachment('photo-y', new Blob(['y'], { type: 'image/jpeg' }));
    await queueAttachmentUpload('photo-y', ORG, USER);
    let refused: unknown;
    await act(async () => { await store.signOut().catch((error: unknown) => { refused = error; }); });
    expect((refused as InstanceType<typeof UnsentOpsError>).count).toBe(1);
    expect(await (await openLocalDb()).get('attachments', 'photo-y')).toBeDefined();
  });

  it('bị gỡ mà không còn gì chưa gửi: dọn sổ ngay và báo', async () => {
    act(() => { store.addSupplier({ name: 'Đã gửi' }); });
    await settle();
    expect(await pendingOps(ORG)).toEqual([]);
    expect(await readBook(ORG)).not.toBeNull();

    removedFrom.add(ORG);
    await act(async () => { await store.refreshMe(); });
    await settle();
    expect(store.leftOrgs).toEqual([{ id: ORG, name: 'Vựa Hùng', unsent: 0 }]);
    expect(await readBook(ORG)).toBeNull();
  });

  it('còn op chưa gửi: bấm dọn thì sổ và op của tổ chức cũ rời máy', async () => {
    offline();
    act(() => { store.addSupplier({ name: 'Ghi lúc mất mạng' }); });
    await settle();
    removedFrom.add(ORG);
    await act(async () => { await store.refreshMe(); });
    await settle();
    await act(async () => { await store.wipeLeftOrg(ORG); });
    expect(store.leftOrgs).toEqual([]);
    expect(await readBook(ORG)).toBeNull();
    expect(await pendingOps(ORG)).toEqual([]);
  });

  it('🔴 máy chủ trả NOT_A_MEMBER khi đẩy: hỏi lại /v1/me và báo đã bị gỡ', async () => {
    net.push.mockImplementation(() => Promise.reject(new ApiError('NOT_A_MEMBER', 403, 'Không thuộc tổ chức')));
    removedFrom.add(ORG);
    act(() => { store.addSupplier({ name: 'Ghi sau khi bị gỡ' }); });
    await until(() => store.leftOrgs.length === 1, 'báo đã bị gỡ');
    expect(store.leftOrgs[0]).toMatchObject({ id: ORG, unsent: 1 });
    // Lỗi của cả lượt: không op nào bị gắn cờ kẹt.
    expect(store.stuck).toBe(false);
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
    expect(store.importsFromFile).toBe(false);
    expect(() => store.importData({ suppliers: [{ id: SERVER_SUPPLIER, name: 'Từ file' }] })).toThrow(L.importWhileSyncing);
    expect(store.data.suppliers).toEqual([]);
  });

  it('🔴 gói hết hạn (không đồng bộ) vẫn không nạp file vào sổ tổ chức (B1)', async () => {
    net.push.mockImplementation(({ ops }: { ops: WireOp[] }) => Promise.resolve({
      results: [{ opId: ops[0]?.opId, status: 'rejected', error: { code: 'PLAN_EXPIRED', message: 'Gói hết hạn' } }],
    }));
    act(() => { store.addSupplier({ name: 'Ghi sau khi hết gói' }); });
    await until(() => Boolean(store.status.blocked), 'máy chủ báo hết gói');
    expect(store.syncsWithServer).toBe(false);

    expect(store.importsFromFile).toBe(false);
    expect(() => store.importData({ suppliers: [{ id: SERVER_SUPPLIER, name: 'Từ file' }] })).toThrow(L.importWhileSyncing);
    expect(store.data.suppliers.some((s) => s.id === SERVER_SUPPLIER)).toBe(false);
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

describe('sửa đối tác: ô để trống là xoá (B5)', () => {
  it('🔴 xoá SĐT, đồng bộ rồi kéo về: SĐT vẫn trống', async () => {
    let id = '';
    act(() => { id = store.addSupplier({ name: 'Cô Mai', phone: '0912 000 111' }).id; });
    await settle();
    net.push.mockClear();

    act(() => store.updateSupplier(id, { phone: '' }));
    await settle();
    const sent = net.push.mock.calls.flatMap(([body]) => (body as { ops: (WireOp & { data?: unknown })[] }).ops);
    expect(sent.find((op) => op.recordId === id)?.data).toEqual({ phone: null });

    // Máy chủ đã nhận: lần kéo sau trả hồ sơ không còn SĐT — không được hiện lại số cũ.
    net.pull.mockImplementation(() => Promise.resolve({
      changes: { ...NO_CHANGES, suppliers: [{ ...supplierRow(id, 'Cô Mai'), updated_at: '2026-10-19T00:00:00.000Z' }] },
      cursor: 'c-b5',
      hasMore: false,
    }));
    act(() => store.syncNow());
    await until(() => net.pull.mock.calls.length > 0, 'kéo về');
    await settle();
    expect(store.data.suppliers.find((s) => s.id === id)?.phone || '').toBe('');
    expect(await pendingOps(ORG)).toHaveLength(0);
  });
});

describe('sổ mồ côi trên máy (B8, sót từ trước 0.20)', () => {
  /** Ba sổ của tổ chức người dùng không còn ở: không ai nhận / còn op của người khác / người khác trên máy còn nhớ. */
  const seed = async () => {
    const db = await openLocalDb();
    const keys = { orphan: crypto.randomUUID(), pending: crypto.randomUUID(), theirs: crypto.randomUUID() };
    await db.put('books', { ...emptyData(), drafts: [{ id: 'd-orphan', attachmentIds: ['orphan-photo'] }] }, keys.orphan);
    await db.put('attachments', new Blob(['o'], { type: 'image/jpeg' }), 'orphan-photo');
    await db.put('books', emptyData(), keys.pending);
    await db.put('books', emptyData(), keys.theirs);
    await enqueue({ entity: 'note', kind: 'insert', recordId: 'n-pending', data: {}, orgId: keys.pending, userId: 'u-other' });
    localStorage.setItem('thumua365_books:u-other', JSON.stringify([{ id: keys.theirs, name: 'Vựa khác' }]));
    return keys;
  };

  it('🔴 sổ không ai nhận, không còn gì chưa gửi: dọn cả sổ lẫn ảnh; sổ còn người nhận hay còn op thì giữ', async () => {
    const keys = await seed();
    await act(async () => { await store.refreshMe(); });
    await settle();
    const db = await openLocalDb();
    expect(await readBook(keys.orphan)).toBeNull();
    expect(await db.get('attachments', 'orphan-photo')).toBeUndefined();
    expect(await readBook(keys.pending)).not.toBeNull();
    expect(await readBook(keys.theirs)).not.toBeNull();
    expect(store.currentOrgId).toBe(ORG);
  });

  it('bản /v1/me của ai đó trên máy không đọc được: không biết hết người nhận thì không dọn gì', async () => {
    const keys = await seed();
    localStorage.setItem('thumua365:me:u-hong', '{"khong":"phai me"}');
    await act(async () => { await store.refreshMe(); });
    await settle();
    expect(await readBook(keys.orphan)).not.toBeNull();
  });
});
