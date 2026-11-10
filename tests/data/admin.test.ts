/**
 * Tầng dữ liệu của trang quản trị: form → đầu vào đúng hợp đồng, lời gọi đúng route, và máy chủ từ chối
 * (không phải quản trị, hết phiên, chưa có route) thành câu nói rõ. Không gọi máy chủ thật — `fetch` là giả.
 */

import { ApiError } from '@mambo/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivateDraft } from '@/data/admin';
import { L } from '@/i18n/labels';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@supabase/auth-js', () => ({
  AuthClient: class {
    getSession = getSession;
  },
}));

const ORG_ID = '11111111-1111-4111-8111-111111111111';

const load = () => import('@/data/admin');

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'https://backend.example/');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://auth.example');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test');
  getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const draft: ActivateDraft = {
  target: ' 0905112233 ',
  plan: 'vua',
  months: 12,
  extraStaff: 2,
  amount: 5_388_000,
  bankTxId: ' FT26081234567 ',
  approvedBy: ' Tài ',
  reason: '  ',
};

describe('activateInput — form mở gói → AdminActivatePlanInput', () => {
  it('số điện thoại → ownerPhone; cắt khoảng trắng; lý do trống thì không gửi', async () => {
    const { activateInput } = await load();
    expect(activateInput(draft)).toEqual({
      input: { ownerPhone: '0905112233', plan: 'vua', months: 12, extraStaff: 2, amount: 5_388_000, bankTxId: 'FT26081234567', approvedBy: 'Tài' },
    });
  });

  it('mã tổ chức (UUID) → organizationId, không gửi ownerPhone', async () => {
    const { activateInput } = await load();
    const checked = activateInput({ ...draft, target: ORG_ID, reason: 'Chuyển sai nội dung' });
    expect(checked).toMatchObject({ input: { organizationId: ORG_ID, reason: 'Chuyển sai nội dung' } });
    expect('input' in checked && 'ownerPhone' in checked.input).toBe(false);
  });

  it('🔴 người cân thêm chỉ gửi khi chọn gói Vựa; "giữ gói đang có" không gửi plan', async () => {
    const { activateInput } = await load();
    const solo = activateInput({ ...draft, plan: 'thuong_lai' });
    expect('input' in solo && 'extraStaff' in solo.input).toBe(false);
    const keep = activateInput({ ...draft, plan: '' });
    expect('input' in keep && ('plan' in keep.input || 'extraStaff' in keep.input)).toBe(false);
    const vuaKeep = activateInput({ ...draft, extraStaff: null });
    expect('input' in vuaKeep && 'extraStaff' in vuaKeep.input).toBe(false);
  });

  it('ô sai → tên ô của form (organizationId / ownerPhone gộp thành target)', async () => {
    const { activateInput } = await load();
    const checked = activateInput({ ...draft, target: '', months: Number.NaN, amount: Number.NaN, bankTxId: 'x', approvedBy: '' });
    expect('invalid' in checked && [...checked.invalid].sort()).toEqual(['amount', 'approvedBy', 'bankTxId', 'months', 'target']);
    expect(activateInput({ ...draft, months: 37 })).toEqual({ invalid: ['months'] });
    expect(activateInput({ ...draft, amount: 199_000.5 })).toEqual({ invalid: ['amount'] });
  });
});

describe('resetInput — form đặt lại mật khẩu → AdminResetPasswordInput', () => {
  it('hợp lệ; sai thì nêu ô', async () => {
    const { resetInput } = await load();
    const ok = { phone: '0905112233', newPassword: 'matkhau-moi-1', approvedBy: 'Tài', reason: '' };
    expect(resetInput(ok)).toEqual({ input: { phone: '0905112233', newPassword: 'matkhau-moi-1', approvedBy: 'Tài' } });
    const bad = resetInput({ ...ok, phone: '0905', newPassword: '1', approvedBy: 'T' });
    expect('invalid' in bad && [...bad.invalid].sort()).toEqual(['approvedBy', 'newPassword', 'phone']);
  });
});

describe('lời gọi /v1/admin/*', () => {
  const result = {
    organization: { id: ORG_ID, name: 'Vựa Tư Hùng', type: 'trader' },
    plan: { tier: 'premium', status: 'active', periodEnd: '2027-11-10T00:00:00.000Z', branchLimit: null, plan: 'vua', extraStaff: 2, staffLimit: 5 },
    alreadyProcessed: false,
  };

  it('activatePlan: POST đúng route, kèm token, thân là đầu vào; trả gói + ngày hết hạn của máy chủ', async () => {
    const transport = vi.fn(async () => json(result));
    vi.stubGlobal('fetch', transport);
    const { activateInput, activatePlan } = await load();
    const checked = activateInput(draft);
    if (!('input' in checked)) throw new Error('đầu vào mẫu phải hợp lệ');

    await expect(activatePlan(checked.input)).resolves.toEqual(result);
    const [url, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://backend.example/v1/admin/plans/activate');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ authorization: 'Bearer token', 'content-type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual(checked.input);
  });

  it('resetPassword: POST đúng route', async () => {
    const transport = vi.fn(async () => json({ ok: true }));
    vi.stubGlobal('fetch', transport);
    const { resetPassword } = await load();
    await resetPassword({ phone: '0905112233', newPassword: 'matkhau-moi-1', approvedBy: 'Tài' });
    const [url, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://backend.example/v1/admin/users/reset-password');
    expect(init.method).toBe('POST');
  });

  it('fetchFunnel: GET với khoảng from–to của số ngày đã chọn', async () => {
    const funnel = { from: '2026-10-11T00:00:00.000Z', to: '2026-11-10T00:00:00.000Z', rows: [] };
    const transport = vi.fn(async () => json(funnel));
    vi.stubGlobal('fetch', transport);
    const { fetchFunnel } = await load();
    await expect(fetchFunnel(30, new Date('2026-11-10T00:00:00.000Z'))).resolves.toEqual(funnel);
    const [url, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://backend.example/v1/admin/funnel?from=2026-10-11T00%3A00%3A00.000Z&to=2026-11-10T00%3A00%3A00.000Z');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('phản hồi sai hợp đồng → CONTRACT_MISMATCH, không chảy vào màn hình', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ rows: 'sai' })));
    const { fetchFunnel } = await load();
    await expect(fetchFunnel(7)).rejects.toMatchObject({ code: 'CONTRACT_MISMATCH' });
  });
});

describe('🔴 không có quyền', () => {
  it('403 của máy chủ (không nằm trong ADMIN_USER_IDS) → câu "không phải quản trị viên"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'FORBIDDEN', message: 'Chỉ quản trị viên', requestId: 'req-1' } }, 403)));
    const { adminDeniedMessage, adminErrorMessage, fetchFunnel } = await load();
    const err: unknown = await fetchFunnel(30).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(adminDeniedMessage(err)).toBe(L.adminForbidden);
    // Bấm nút mà bị từ chối thì câu của máy chủ hiện nguyên văn.
    expect(adminErrorMessage(err)).toBe('Chỉ quản trị viên');
  });

  it('chưa đăng nhập / hết phiên → không gửi gì, báo đăng nhập lại', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const transport = vi.fn();
    vi.stubGlobal('fetch', transport);
    const { adminDeniedMessage, fetchFunnel } = await load();
    const err: unknown = await fetchFunnel(30).catch((e: unknown) => e);
    expect(adminDeniedMessage(err)).toBe(L.adminSignedOut);
    expect(transport).not.toHaveBeenCalled();
  });

  it('404 không theo hợp đồng (API cũ chưa có route) → báo máy chủ chưa có chức năng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ statusCode: 404, message: 'Cannot GET /v1/admin/funnel' }, 404)));
    const { adminDeniedMessage, fetchFunnel } = await load();
    expect(adminDeniedMessage(await fetchFunnel(30).catch((e: unknown) => e))).toBe(L.adminUnavailable);
  });

  it('lỗi mạng, lỗi 5xx không phải chuyện quyền', async () => {
    const { adminDeniedMessage, adminErrorMessage } = await load();
    expect(adminDeniedMessage(new TypeError('Failed to fetch'))).toBeNull();
    expect(adminErrorMessage(new TypeError('Failed to fetch'))).toBe(L.adminOffline);
    const internal = new ApiError('INTERNAL', 500, 'Lỗi máy chủ', 'req-9');
    expect(adminDeniedMessage(internal)).toBeNull();
    expect(adminErrorMessage(internal)).toBe('Lỗi máy chủ (id: req-9)');
  });
});

describe('ownedOrganizations', () => {
  it('"Số này chủ nhiều tổ chức" → danh sách để chọn; lỗi khác → rỗng', async () => {
    const { ownedOrganizations } = await load();
    const organizations = [{ id: ORG_ID, name: 'Vựa Tư Hùng' }, { id: '22222222-2222-4222-8222-222222222222', name: 'Vựa Hai' }];
    expect(ownedOrganizations(new ApiError('VALIDATION_FAILED', 422, 'Số này chủ nhiều tổ chức — gửi organizationId', undefined, { organizations }))).toEqual(organizations);
    expect(ownedOrganizations(new ApiError('NOT_FOUND', 404, 'Không có tài khoản với số này'))).toEqual([]);
    expect(ownedOrganizations(new Error('x'))).toEqual([]);
  });
});
