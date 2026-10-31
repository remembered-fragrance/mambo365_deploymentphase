// @vitest-environment jsdom
/**
 * Gói theo quy mô (0.28.0, Phần 3b): đăng ký tách Thương lái / Vựa, màn Gói theo gói + người cân, câu chặn khi gói
 * thấp, tên loại tài khoản theo gói. Giá thật lấy từ máy chủ (`offer`) — test đưa bảng giá như máy chủ trả.
 */

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentIntentCreateInput, PlanCode, PlanSummary } from '@mambo/contracts';
import { formatVnd } from '@mambo/core/format';
import type { PaymentIntent, PlanState } from '@mambo/core/subscription';
import type { BillingOffer } from '@/data/billing';
import type { SubscriptionValue } from '@/data/hooks/useSubscription';
import { StoreContext, type StoreValue } from '@/data/useStore';
import { PlanGate } from '@/features/billing/PlanGate';
import { PlansPage } from '@/features/billing/PlansPage';
import { SetupOrgPage } from '@/features/onboarding/SetupOrgPage';
import { orgTypeText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';

let sub: SubscriptionValue;
vi.mock('@/data/hooks/useSubscription', () => ({ useSubscription: () => sub }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OFFER: BillingOffer = {
  selfServe: true,
  prices: [
    { plan: 'vua', months: 1, amount: 449_000 },
    { plan: 'vua', months: 12, amount: 4_490_000 },
    { plan: 'thuong_lai', months: 1, amount: 199_000 },
    { plan: 'thuong_lai', months: 12, amount: 1_990_000 },
  ],
  staffPrices: [
    { months: 1, amount: 79_000 },
    { months: 12, amount: 790_000 },
  ],
  staffTopUps: [],
};

const TRIAL: PlanState = { tier: 'trial', premium: true, endsAt: '2026-11-30T00:00:00.000Z', daysLeft: 30 };
const PAID: PlanState = { tier: 'premium', premium: true, endsAt: '2026-12-20T00:00:00.000Z', daysLeft: 50 };

const intent = (amount: number): PaymentIntent => ({
  id: 'aaaaaaaa-3333-4333-8333-333333333333',
  amount,
  status: 'pending',
  code: 'ABC123',
  createdAt: '2026-10-31T00:00:00.000Z',
});

const startPayment = vi.fn<(input: PaymentIntentCreateInput) => Promise<PaymentIntent>>();

const subscriptionOf = (plan: PlanState, planCode: PlanCode | null, offer: BillingOffer = OFFER): SubscriptionValue => ({
  billingAvailable: offer.selfServe,
  offer,
  plan,
  planCode,
  quota: { used: 0, limit: 30, remaining: 30, blocked: false, warn: false } as unknown as SubscriptionValue['quota'],
  subscription: null,
  intents: [],
  loading: false,
  refresh: () => undefined,
  startPayment,
});

const summaryOf = (plan: PlanCode | null, extraStaff = 0): PlanSummary => ({
  tier: 'premium',
  status: 'active',
  periodEnd: PAID.endsAt ?? null,
  branchLimit: null,
  plan,
  extraStaff,
  staffLimit: plan === 'thuong_lai' ? 0 : plan === 'vua' ? 3 + extraStaff : null,
});

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  startPayment.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

const render = (store: Partial<StoreValue>, node: ReactNode) =>
  act(() =>
    root.render(
      createElement(StoreContext.Provider, { value: { orgType: 'trader', permissions: ['billing:manage'], bookKey: null, ...store } as StoreValue },
        createElement(MemoryRouter, null, node)),
    ),
  );

/** Hộp thoại (QR) vẽ qua portal ra `document.body` — đọc cả trang chứ không chỉ `host`. */
const pageText = () => document.body.textContent ?? '';
const buttons = (label: string) => [...document.querySelectorAll('button')].filter((b) => b.textContent === label);

const click = async (el: HTMLElement | null | undefined) => {
  if (!el) throw new Error('Không thấy nút');
  await act(async () => el.click());
};

const choose = (label: string, value: string) => {
  const select = [...host.querySelectorAll('select')].find((s) => s.labels?.[0]?.textContent === label);
  if (!select) throw new Error(`Không thấy ô chọn ${label}`);
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value);
  act(() => { select.dispatchEvent(new Event('change', { bubbles: true })); });
};

describe('màn Gói — Thương lái · Vựa · người cân thêm', () => {
  it('Vựa trả tháng + 2 người cân = 607.000₫; mua gửi đúng gói, số tháng, số người và màn QR ghi rõ', async () => {
    sub = subscriptionOf(TRIAL, 'thuong_lai');
    startPayment.mockResolvedValue(intent(607_000));
    render({ plan: { ...summaryOf('thuong_lai'), tier: 'trial' }, refreshPlan: () => undefined }, createElement(PlansPage));

    await click([...host.querySelectorAll('button[role="radio"]')].find((b) => b.textContent === L.priceMonthly) as HTMLElement);
    choose(L.planExtraStaff, '2');
    expect(pageText()).toContain(`${L.planTotal}: ${formatVnd(607_000)}`);

    // Thẻ Vựa đứng trước thẻ Thương lái.
    await click(buttons(L.planBuy)[0]);
    expect(startPayment).toHaveBeenCalledWith({ kind: 'plan', plan: 'vua', months: 1, extraStaff: 2 });
    expect(pageText()).toContain(`${L.planNameVua} · ${L.payPeriodMonth} · ${L.payExtraStaffPrefix} 2 ${L.payExtraStaffSuffix}`);
  });

  it('đang Thương lái: thẻ Thương lái là "Gia hạn", gửi gói thuong_lai, không kèm người cân', async () => {
    sub = subscriptionOf(PAID, 'thuong_lai');
    startPayment.mockResolvedValue(intent(1_990_000));
    render({ plan: summaryOf('thuong_lai'), refreshPlan: () => undefined }, createElement(PlansPage));

    expect(pageText()).toContain(formatVnd(1_990_000));
    await click(buttons(L.planRenew)[0]);
    expect(startPayment).toHaveBeenCalledWith({ kind: 'plan', plan: 'thuong_lai', months: 12 });
  });

  it('Vựa còn hạn: nút mua Thương lái khoá, ghi rõ mua được sau ngày hết hạn', () => {
    sub = subscriptionOf(PAID, 'vua');
    render({ plan: summaryOf('vua'), refreshPlan: () => undefined }, createElement(PlansPage));

    expect(buttons(L.planBuy)[0]?.disabled).toBe(true);
    expect(pageText()).toContain(L.planDowngradeLocked);
  });

  it('mua thêm người cân giữa kỳ: giá máy chủ tính theo ngày, gửi kind staff', async () => {
    sub = subscriptionOf(PAID, 'vua', {
      ...OFFER,
      staffTopUps: [
        { extraStaff: 1, amount: 52_000 },
        { extraStaff: 2, amount: 105_000 },
      ],
    });
    startPayment.mockResolvedValue(intent(105_000));
    render({ plan: summaryOf('vua'), refreshPlan: () => undefined }, createElement(PlansPage));

    choose(L.staffTopUpCount, '2');
    expect(pageText()).toContain(`${L.planTotal}: ${formatVnd(105_000)}`);
    await click(buttons(L.staffTopUpBuy)[0]);
    expect(startPayment).toHaveBeenCalledWith({ kind: 'staff', extraStaff: 2 });
  });

  it('không có giá mua thêm (Thương lái, dùng thử) → không có thẻ mua thêm người cân', () => {
    sub = subscriptionOf(TRIAL, 'vua');
    render({ plan: { ...summaryOf('vua'), tier: 'trial' }, refreshPlan: () => undefined }, createElement(PlansPage));
    expect(buttons(L.staffTopUpBuy)).toHaveLength(0);
    // Dùng thử chưa trả tiền: mua lần đầu, không phải "Gia hạn".
    expect(buttons(L.planRenew)).toHaveLength(0);
  });

  it('doanh nghiệp: giữ như cũ — câu liên hệ Zalo, không có nút mua', () => {
    sub = subscriptionOf(PAID, null, { ...OFFER, selfServe: false, prices: [], staffPrices: [] });
    render({ orgType: 'enterprise', plan: summaryOf(null), refreshPlan: () => undefined }, createElement(PlansPage));

    expect(pageText()).toContain(L.billingContact);
    expect(buttons(L.planBuy)).toHaveLength(0);
  });
});

describe('câu chặn khi gói thấp', () => {
  it('Thương lái còn hạn bị chặn thêm người cân → mời nâng lên gói Vựa, không bảo gia hạn', () => {
    sub = subscriptionOf(PAID, 'thuong_lai');
    render({}, createElement(PlanGate, { reason: L.gateMembers, feature: 'members' }));
    expect(host.textContent).toContain(L.gateSoloMembers);
    expect(host.textContent).toContain(L.gateUpgradeVua);
  });

  it('gói Vựa hết hạn → câu gia hạn như cũ', () => {
    sub = subscriptionOf({ tier: 'free', premium: false, daysLeft: 0 }, 'vua');
    render({}, createElement(PlanGate, { reason: L.gateMembers, feature: 'members' }));
    expect(host.textContent).toContain(L.gateMembers);
    expect(host.textContent).not.toContain(L.gateUpgradeVua);
  });
});

describe('đăng ký — "Bạn là ai?" tách Thương lái / Vựa', () => {
  const signUp = async (label: string) => {
    const bootstrap = vi.fn().mockResolvedValue({});
    render({ user: { name: 'Khôi' } as StoreValue['user'], bootstrap, signOut: vi.fn() }, createElement(SetupOrgPage));
    await click([...host.querySelectorAll('button[role="radio"]')].find((b) => b.textContent?.startsWith(label)) as HTMLElement);
    const orgName = host.querySelector('input');
    if (orgName && label !== L.orgFarmer) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(orgName, 'Vựa Tư Hùng');
      act(() => { orgName.dispatchEvent(new Event('input', { bubbles: true })); });
    }
    await click(buttons(L.setupSubmit)[0]);
    return bootstrap;
  };

  it.each([
    [L.orgSolo, 'thuong_lai'],
    [L.orgVua, 'vua'],
  ] as const)('chọn "%s" → tạo tài khoản vựa kèm gói %s', async (label, plan) => {
    const bootstrap = await signUp(label);
    expect(bootstrap).toHaveBeenCalledWith(expect.objectContaining({ orgType: 'trader', plan, orgName: 'Vựa Tư Hùng' }));
  });

  it('nông dân, doanh nghiệp không gửi gói', async () => {
    const farmer = await signUp(L.orgFarmer);
    expect(farmer.mock.calls[0]?.[0]).toMatchObject({ orgType: 'farmer' });
    expect(farmer.mock.calls[0]?.[0]).not.toHaveProperty('plan');
  });
});

describe('Tài khoản — loại tài khoản theo gói', () => {
  it('vựa ghi đúng gói; doanh nghiệp, nông dân, chưa biết gói giữ nhãn chung', () => {
    expect(orgTypeText('trader', 'thuong_lai')).toBe(L.orgSolo);
    expect(orgTypeText('trader', 'vua')).toBe(L.orgVua);
    expect(orgTypeText('trader', null)).toBe(L.orgTrader);
    expect(orgTypeText('enterprise', null)).toBe(L.orgEnterprise);
    expect(orgTypeText('farmer', undefined)).toBe(L.orgFarmer);
  });
});
