// @vitest-environment jsdom
/**
 * Trang `/quan-tri`: máy chủ từ chối thì chỉ còn một câu, không form nào; được vào thì đủ ba phần; mở gói phải
 * qua hộp xác nhận ghi rõ mở cho ai rồi mới gọi, và hiện gói + ngày hết hạn máy chủ trả về.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminActivatePlanInput, AdminActivatePlanResult, AdminPaymentRow } from '@mambo/contracts';
import { formatDate } from '@mambo/core/format';
import type { FunnelState, PaymentsState } from '@/data/hooks/useAdmin';
import { AdminPage } from '@/features/admin/AdminPage';
import { eventText } from '@/features/admin/adminText';
import { paymentStatus } from '@/features/admin/paymentStatus';
import { L } from '@/i18n/labels';

const funnel = vi.hoisted(() => ({ current: null as unknown }));
// Các mục mới (API 0.32.0) gọi qua `useAdminRequest` — ca thử ghi lại lời gọi, trả "chưa có gì".
const requests = vi.hoisted(() => ({ calls: [] as unknown[] }));
const payments = vi.hoisted(() => ({ loaded: null as unknown, requests: [] as unknown[] }));
const activatePlan = vi.fn<(input: AdminActivatePlanInput) => Promise<AdminActivatePlanResult>>();
const resetPassword = vi.fn<(input: unknown) => Promise<void>>();

// Giữ `activateInput` / `resetInput` thật (kiểm bằng schema hợp đồng); chỉ thay thứ chạm mạng.
vi.mock('@/data/hooks/useAdmin', async (original) => ({
  ...(await original<typeof import('@/data/hooks/useAdmin')>()),
  useAdminFunnel: () => funnel.current,
  // Chưa bấm xem (`request` null) thì không có gì; bấm rồi thì trả danh sách của ca thử.
  useAdminPayments: (request: unknown) => {
    if (request) payments.requests.push(request);
    return request ? payments.loaded : { data: null, loading: false, error: null };
  },
  useAdminRequest: (request: unknown) => {
    if (request !== null) requests.calls.push(request);
    return { data: null, loading: false, error: null };
  },
  activatePlan: (input: AdminActivatePlanInput) => activatePlan(input),
  resetPassword: (input: unknown) => resetPassword(input),
}));

// Trang có khung riêng: đọc tên tài khoản, đăng xuất, chế độ sáng / tối từ store.
const signOut = vi.fn(() => Promise.resolve());
vi.mock('@/data/useStore', () => ({
  useStore: () => ({
    me: { user: { id: 'u', name: 'Admin', phone: null, email: null, phoneVerified: false }, memberships: [], pendingLinks: 0, isAdmin: true },
    user: null,
    signOut,
    data: { settings: { displayMode: 'indoor' } },
    updateSettings: () => undefined,
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const READY: FunnelState = {
  data: {
    from: '2026-10-11T00:00:00.000Z',
    to: '2026-11-10T00:00:00.000Z',
    rows: [{ orgType: 'trader', name: 'plans_viewed', events: 7, organizations: 3, devices: 4, firstAt: '2026-10-12T02:00:00.000Z', lastAt: '2026-11-09T02:00:00.000Z' }],
  },
  loading: false,
  denied: null,
  error: null,
  reload: () => undefined,
};

let root: Root;
let host: HTMLDivElement;

const render = (state: FunnelState) => {
  funnel.current = state;
  act(() => root.render(createElement(MemoryRouter, { initialEntries: ['/quan-tri'] }, createElement(AdminPage))));
};

const input = (label: string): HTMLInputElement => {
  const id = [...host.querySelectorAll('label')].find((l) => l.textContent === label)?.htmlFor;
  const el = id ? document.getElementById(id) : null;
  if (!(el instanceof HTMLInputElement)) throw new Error(`Không thấy ô "${label}"`);
  return el;
};

const type = (label: string, value: string) => {
  const el = input(label);
  // React theo dõi giá trị qua setter gốc — gán thẳng `el.value` thì onChange không chạy.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, value);
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const click = async (el: Element | null | undefined) => {
  if (!(el instanceof HTMLElement)) throw new Error('Không thấy nút');
  await act(async () => el.click());
};

const button = (within: ParentNode, text: string) => [...within.querySelectorAll('button')].find((b) => b.textContent === text);
const openTab = (label: string) => click(button(host, label));
const dialog = () => document.body.querySelector('[role="dialog"]');

beforeEach(() => {
  activatePlan.mockReset();
  payments.requests.length = 0;
  requests.calls.length = 0;
  resetPassword.mockReset();
  // jsdom không có matchMedia; ô tiền hỏi nó để chọn bàn phím số.
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('trang Quản trị', () => {
  it('🔴 máy chủ từ chối → chỉ một câu nói rõ, không form nào', () => {
    render({ ...READY, data: null, denied: L.adminForbidden });
    expect(host.textContent).toContain(L.adminDeniedTitle);
    expect(host.textContent).toContain(L.adminForbidden);
    expect(host.querySelector('input')).toBeNull();
    expect(button(host, L.adminActivateSubmit)).toBeUndefined();
  });

  it('chưa có câu trả lời đầu tiên của máy chủ → chưa bày form', () => {
    render({ ...READY, data: null, loading: true });
    expect(host.querySelector('input')).toBeNull();
  });

  it('được vào → bảy mục; Tổng quan có số liệu chung + bảng phễu; Thanh toán có mở gói + giao dịch; Người dùng có đặt lại mật khẩu', async () => {
    render(READY);
    const titles = () => [...host.querySelectorAll('h2')].map((h) => h.textContent);
    for (const tab of [L.adminTabOverview, L.adminTabOrgs, L.adminTabPayments, L.adminTabPromo, L.adminTabUsers, L.adminTabFeedback, L.adminTabLog]) {
      expect(button(host, tab), tab).toBeDefined();
    }
    expect(titles()).toEqual(expect.arrayContaining([L.adminOverviewTitle, L.adminFunnelTitle]));
    // Phễu ghi tên sự kiện bằng lời thường; mã gốc vẫn ở `title` để đối chiếu log.
    expect(host.querySelector('table')?.textContent).toContain(L.adminEvPlansViewed);
    expect(host.querySelector('table [title="plans_viewed"]')).not.toBeNull();

    await openTab(L.adminTabPayments);
    expect(titles()).toEqual(expect.arrayContaining([L.adminActivateTitle, L.adminPaymentsTitle]));
    await openTab(L.adminTabUsers);
    expect(titles()).toEqual(expect.arrayContaining([L.adminUsersTitle, L.adminResetTitle]));
  });

  it('🔴 tổ chức, phản hồi KHÔNG tự gọi khi mở; tổng quan, người dùng (mọi tài khoản), mã, nhật ký thì tự tải', async () => {
    render(READY);
    expect(requests.calls).toHaveLength(1); // số liệu chung
    for (const tab of [L.adminTabOrgs, L.adminTabFeedback]) {
      await openTab(tab);
      expect(requests.calls, tab).toHaveLength(1);
    }
    // 0.34.0: mở tab Người dùng là tải trang đầu của mọi tài khoản (không `q`).
    await openTab(L.adminTabUsers);
    expect(requests.calls.at(-1)).toEqual({});
    const afterUsers = requests.calls.length;
    await openTab(L.adminTabPromo);
    await openTab(L.adminTabLog);
    expect(requests.calls).toHaveLength(afterUsers + 2);

    await openTab(L.adminTabOrgs);
    await click(button(host, L.adminOrgsSearch));
    expect(requests.calls.at(-1)).toEqual({});
  });

  it('form thiếu → tô ô sai, không mở hộp xác nhận, không gọi', async () => {
    render(READY);
    await openTab(L.adminTabPayments);
    await click(button(host, L.adminActivateSubmit));
    expect(host.textContent).toContain(L.adminErrTarget);
    expect(host.textContent).toContain(L.adminErrMonths);
    expect(host.textContent).toContain(L.adminErrAmount);
    expect(dialog()).toBeNull();
    expect(activatePlan).not.toHaveBeenCalled();
  });

  it('mở gói: hộp xác nhận ghi rõ số của chủ → đồng ý mới gọi → hiện tổ chức và ngày hết hạn máy chủ trả', async () => {
    const periodEnd = '2027-11-10T00:00:00.000Z';
    activatePlan.mockResolvedValue({
      organization: { id: '11111111-1111-4111-8111-111111111111', name: 'Vựa Tư Hùng', type: 'trader' },
      plan: { tier: 'premium', status: 'active', periodEnd, branchLimit: null, plan: 'vua', extraStaff: 0, staffLimit: 3 },
      alreadyProcessed: false,
    });
    render(READY);
    await openTab(L.adminTabPayments);
    type(L.adminTarget, '0905112233');
    type(L.adminMonths, '12');
    type(L.adminAmount, '4490000');
    type(L.adminBankTxId, 'FT26081234567');
    // Hai form đều có ô "Người duyệt" — ô đầu là của form mở gói.
    type(L.adminApprovedBy, 'Tài');

    await click(button(host, L.adminActivateSubmit));
    expect(activatePlan).not.toHaveBeenCalled();
    expect(dialog()?.textContent).toContain(`${L.adminConfirmOwner} 0905112233`);
    expect(dialog()?.textContent).toContain('FT26081234567');

    await click(button(dialog() as Element, L.adminActivateSubmit));
    expect(activatePlan).toHaveBeenCalledWith({ ownerPhone: '0905112233', months: 12, amount: 4_490_000, bankTxId: 'FT26081234567', approvedBy: 'Tài' });
    const status = host.querySelector('[role="status"]')?.textContent ?? '';
    expect(status).toContain('Vựa Tư Hùng');
    expect(status).toContain(formatDate(periodEnd));
    expect(input(L.adminBankTxId).value).toBe('');
  });

  it('máy chủ từ chối lúc mở gói → câu của máy chủ hiện nguyên văn, giữ nguyên form', async () => {
    activatePlan.mockRejectedValue(new Error('Không có tài khoản với số này'));
    render(READY);
    await openTab(L.adminTabPayments);
    type(L.adminTarget, '0905112233');
    type(L.adminMonths, '1');
    type(L.adminAmount, '199000');
    type(L.adminBankTxId, 'FT1');
    type(L.adminApprovedBy, 'Tài');
    await click(button(host, L.adminActivateSubmit));
    await click(button(dialog() as Element, L.adminActivateSubmit));
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Không có tài khoản với số này');
    expect(input(L.adminBankTxId).value).toBe('FT1');
  });
});

describe('tên sự kiện phễu', () => {
  it('sự kiện biết thì dịch; sự kiện lạ của API mới hơn hiện nguyên mã', () => {
    expect(eventText('checkout_started')).toBe(L.adminEvCheckout);
    expect(eventText('su_kien_moi')).toBe('su_kien_moi');
  });
});

describe('giao dịch mua gói', () => {
  const at = '2026-11-09T02:00:00.000Z';
  const org = { id: '11111111-1111-4111-8111-111111111111', name: 'Vựa Tư Hùng', type: 'trader' as const };
  const intent = { id: '22222222-2222-4222-8222-222222222222', amount: 449_000, code: 'AB12CD', status: 'pending' as const, createdAt: at };
  const bank = { bankTxId: 'FT-1', amount: 449_000, source: 'webhook' as const, outcome: 'applied' as const, createdAt: at };
  const row = (patch: Partial<AdminPaymentRow>): AdminPaymentRow => ({ at, organization: org, intent, bank, ...patch });

  it('🔴 tiền đã vào mà gói chưa mở (thiếu, không khớp mã, mã đã đóng) → cần người xem; đã mở, chưa trả → không', () => {
    expect(paymentStatus(row({}))).toEqual({ text: L.adminPayApplied, needsAction: false });
    expect(paymentStatus(row({ intent: null, bank: { ...bank, source: 'admin' } }))).toEqual({ text: `${L.adminPayApplied} (${L.adminPaymentsByHand})`, needsAction: false });
    for (const outcome of ['underpaid', 'no_intent', 'intent_closed'] as const) {
      expect(paymentStatus(row({ bank: { ...bank, outcome } })).needsAction).toBe(true);
    }
    expect(paymentStatus(row({ bank: null }))).toEqual({ text: L.adminPayPending, needsAction: false });
    expect(paymentStatus(row({ bank: null, intent: { ...intent, status: 'expired' } })).text).toBe(L.adminPayExpired);
  });

  it('🔴 mở trang KHÔNG tự gọi (mỗi lần xem máy chủ ghi nhật ký); bấm "Xem giao dịch" mới gọi, đúng số ngày đang chọn', async () => {
    payments.loaded = {
      data: { from: at, to: at, rows: [row({ bank: { ...bank, amount: 100_000, outcome: 'underpaid' } }), row({ organization: null, intent: null, bank: { ...bank, bankTxId: 'FT-2' } })] },
      loading: false,
      error: null,
    } satisfies PaymentsState;
    render(READY);
    await openTab(L.adminTabPayments);
    expect(payments.requests).toEqual([]);
    expect(host.querySelectorAll('table')).toHaveLength(0);

    await click(button(host, L.adminPaymentsShow));
    expect(payments.requests).toEqual([{ days: 30 }]);
    const table = [...host.querySelectorAll('table')].find((t) => t.textContent?.includes('FT-1'));
    expect(table?.textContent).toContain('Vựa Tư Hùng');
    expect(table?.textContent).toContain(L.adminPayUnderpaid);
    expect(table?.textContent).toContain(L.adminPaymentsOrgDeleted);
  });

  it('máy chủ báo lỗi (API cũ chưa có route) → hiện câu báo, không có bảng giao dịch', async () => {
    payments.loaded = { data: null, loading: false, error: L.adminUnavailable } satisfies PaymentsState;
    render(READY);
    await openTab(L.adminTabPayments);
    await click(button(host, L.adminPaymentsShow));
    expect(host.textContent).toContain(L.adminUnavailable);
    expect(host.querySelectorAll('table')).toHaveLength(0);
  });
});
