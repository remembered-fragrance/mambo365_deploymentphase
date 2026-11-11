// @vitest-environment jsdom
/**
 * Trang `/quan-tri`: máy chủ từ chối thì chỉ còn một câu, không form nào; được vào thì đủ ba phần; mở gói phải
 * qua hộp xác nhận ghi rõ mở cho ai rồi mới gọi, và hiện gói + ngày hết hạn máy chủ trả về.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminActivatePlanInput, AdminActivatePlanResult } from '@mambo/contracts';
import { formatDate } from '@mambo/core/format';
import type { FunnelState } from '@/data/hooks/useAdmin';
import { AdminPage } from '@/features/admin/AdminPage';
import { L } from '@/i18n/labels';

const funnel = vi.hoisted(() => ({ current: null as unknown }));
const activatePlan = vi.fn<(input: AdminActivatePlanInput) => Promise<AdminActivatePlanResult>>();
const resetPassword = vi.fn<(input: unknown) => Promise<void>>();

// Giữ `activateInput` / `resetInput` thật (kiểm bằng schema hợp đồng); chỉ thay thứ chạm mạng.
vi.mock('@/data/hooks/useAdmin', async (original) => ({
  ...(await original<typeof import('@/data/hooks/useAdmin')>()),
  useAdminFunnel: () => funnel.current,
  activatePlan: (input: AdminActivatePlanInput) => activatePlan(input),
  resetPassword: (input: unknown) => resetPassword(input),
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
  act(() => root.render(createElement(AdminPage)));
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
const dialog = () => document.body.querySelector('[role="dialog"]');

beforeEach(() => {
  activatePlan.mockReset();
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

  it('được vào → mở gói, đặt lại mật khẩu, chỗ chừa cho giao dịch, bảng phễu', () => {
    render(READY);
    for (const title of [L.adminActivateTitle, L.adminResetTitle, L.adminPaymentsTitle, L.adminFunnelTitle]) {
      expect([...host.querySelectorAll('h2')].map((h) => h.textContent)).toContain(title);
    }
    expect(host.querySelector('table')?.textContent).toContain('plans_viewed');
  });

  it('form thiếu → tô ô sai, không mở hộp xác nhận, không gọi', async () => {
    render(READY);
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
