// @vitest-environment jsdom
/**
 * Mã Khách hàng sáng lập (0.29.0) trên màn Gói: ô nhập mã khi chưa có, giá sau mã kèm giá thường gạch ngang, số tháng
 * giá ưu đãi còn lại, câu báo của máy chủ hiện nguyên văn. Giá thật do máy chủ trả (`offer.prices` đã là giá sau mã).
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanSummary, PromoView } from '@mambo/contracts';
import { formatVnd } from '@mambo/core/format';
import type { PlanState } from '@mambo/core/subscription';
import type { BillingOffer } from '@/data/billing';
import type { SubscriptionValue } from '@/data/hooks/useSubscription';
import { StoreContext, type StoreValue } from '@/data/useStore';
import { PlansPage } from '@/features/billing/PlansPage';
import { L } from '@/i18n/labels';

let sub: SubscriptionValue;
vi.mock('@/data/hooks/useSubscription', () => ({ useSubscription: () => sub }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PROMO: PromoView = { code: 'SL149-AB12CD', plan: 'thuong_lai', monthlyAmount: 149_000, periods: 12, periodsLeft: 12 };

const offerOf = (promo: PromoView | null): BillingOffer => ({
  selfServe: true,
  prices: [
    { plan: 'vua', months: 1, amount: 449_000 },
    { plan: 'vua', months: 12, amount: 4_490_000 },
    { plan: 'thuong_lai', months: 1, amount: promo && promo.periodsLeft > 0 ? 149_000 : 199_000 },
    { plan: 'thuong_lai', months: 6, amount: promo && promo.periodsLeft >= 6 ? 894_000 : 1_074_600 },
    { plan: 'thuong_lai', months: 12, amount: promo?.periodsLeft === 12 ? 1_788_000 : 2_030_400 },
  ],
  staffPrices: [
    { months: 1, amount: 79_000 },
    { months: 12, amount: 790_000 },
  ],
  staffTopUps: [],
  promo,
});

const TRIAL: PlanState = { tier: 'trial', premium: true, endsAt: '2026-12-10T00:00:00.000Z', daysLeft: 30 };
const SUMMARY: PlanSummary = {
  tier: 'trial',
  status: 'trialing',
  periodEnd: TRIAL.endsAt ?? null,
  branchLimit: null,
  plan: 'thuong_lai',
  extraStaff: 0,
  staffLimit: 1,
};

const redeemPromo = vi.fn<(code: string) => Promise<void>>();

const subscriptionOf = (offer: BillingOffer): SubscriptionValue => ({
  billingAvailable: true,
  offer,
  plan: TRIAL,
  planCode: 'thuong_lai',
  quota: { used: 0, limit: 30, remaining: 30, blocked: false, warn: false } as unknown as SubscriptionValue['quota'],
  subscription: null,
  intents: [],
  loading: false,
  refresh: () => undefined,
  startPayment: vi.fn(),
  redeemPromo,
});

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  redeemPromo.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

const render = () =>
  act(() =>
    root.render(
      createElement(
        StoreContext.Provider,
        { value: { orgType: 'trader', permissions: ['billing:manage'], bookKey: null, plan: SUMMARY, refreshPlan: () => undefined } as unknown as StoreValue },
        createElement(MemoryRouter, null, createElement(PlansPage)),
      ),
    ),
  );

const text = () => host.textContent ?? '';
const button = (label: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === label);
const period = async (label: string) => {
  const radio = [...host.querySelectorAll('button[role="radio"]')].find((b) => b.textContent === label) as HTMLElement;
  await act(async () => radio.click());
};
const monthly = () => period(L.priceMonthly);
const type = (value: string) => {
  const input = [...host.querySelectorAll('input')].find((i) => i.labels?.[0]?.textContent === L.promoInput);
  if (!input) throw new Error('Không thấy ô nhập mã');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  act(() => { input.dispatchEvent(new Event('input', { bubbles: true })); });
};

describe('mã Khách hàng sáng lập trên màn Gói', () => {
  it('chưa có mã: có ô nhập; gõ chữ thường → gửi chữ hoa; nút khoá khi ô trống', async () => {
    sub = subscriptionOf(offerOf(null));
    redeemPromo.mockResolvedValue(undefined);
    render();

    expect(text()).toContain(L.promoTitle);
    expect(button(L.promoApply)?.disabled).toBe(true);
    type('sl149-ab12cd');
    await act(async () => button(L.promoApply)?.click());
    expect(redeemPromo).toHaveBeenCalledWith('SL149-AB12CD');
  });

  it('mã có dấu cách ở giữa → báo ngay trên máy, không gửi lên', async () => {
    sub = subscriptionOf(offerOf(null));
    render();
    type('DEMO SL149 01');
    await act(async () => button(L.promoApply)?.click());
    expect(redeemPromo).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(L.promoBadChars);
  });

  it('máy chủ từ chối → câu báo hiện nguyên văn', async () => {
    sub = subscriptionOf(offerOf(null));
    redeemPromo.mockRejectedValue(new Error('Mã không đúng hoặc đã có người dùng'));
    render();

    type('SL149-SAI000');
    await act(async () => button(L.promoApply)?.click());
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Mã không đúng hoặc đã có người dùng');
  });

  it('đã có mã: không còn ô nhập; Thương lái tháng 149.000₫, giá thường 199.000₫ gạch ngang; còn 12 tháng', async () => {
    sub = subscriptionOf(offerOf(PROMO));
    render();
    await monthly();

    expect(host.querySelector('input')).toBeNull();
    expect(text()).toContain(PROMO.code);
    expect(text()).toContain(formatVnd(149_000));
    expect([...host.querySelectorAll('s')].map((s) => s.textContent)).toEqual([formatVnd(199_000)]);
    expect(text()).toContain(`${L.promoLeftPrefix} 12 ${L.promoLeftSuffix}`);
  });

  it('trả năm khi còn đủ 12 kỳ: 1.788.000₫, giá thường 2.030.400₫ gạch ngang', () => {
    sub = subscriptionOf(offerOf(PROMO));
    render();

    expect(text()).toContain(formatVnd(1_788_000));
    expect([...host.querySelectorAll('s')].map((s) => s.textContent)).toEqual([formatVnd(2_030_400)]);
  });

  it('năm ưu đãi ghi rõ 12 × 149.000₫; đã dùng 1 kỳ thì năm về giá thường và có câu nhắc trả tháng', () => {
    sub = subscriptionOf(offerOf(PROMO));
    render();
    expect(text()).toContain(`${L.promoPrepayIs} 12 × ${formatVnd(149_000)}`);
    expect(text()).not.toContain(L.promoPrepayLost);

    sub = subscriptionOf(offerOf({ ...PROMO, periodsLeft: 11 }));
    render();
    expect(text()).toContain(L.promoPrepayLost);
  });

  it('6 tháng (0.30.0): 894.000₫ = 6 × 149.000₫, giá thường 1.074.600₫; còn 5 kỳ thì về giá thường', async () => {
    sub = subscriptionOf(offerOf(PROMO));
    render();
    await period(L.priceHalfYearly);
    expect(text()).toContain(formatVnd(894_000));
    expect(text()).toContain(`${L.promoPrepayIs} 6 × ${formatVnd(149_000)}`);
    expect([...host.querySelectorAll('s')].map((s) => s.textContent)).toEqual([formatVnd(1_074_600)]);
    // Gói Vựa không có kỳ 6 tháng: thẻ chỉ nhắc chọn kỳ khác, không có nút mua.
    expect(text()).toContain(L.planVuaNoHalfYear);

    sub = subscriptionOf(offerOf({ ...PROMO, periodsLeft: 5 }));
    render();
    await period(L.priceHalfYearly);
    expect(text()).toContain(formatVnd(1_074_600));
    expect(text()).toContain(L.promoPrepayLost);
  });

  it('gói Vựa đã trả còn hạn: không có ô nhập mã, báo nhập sau ngày hết hạn', () => {
    sub = { ...subscriptionOf(offerOf(null)), planCode: 'vua', plan: { tier: 'premium', premium: true, endsAt: '2026-12-20T00:00:00.000Z', daysLeft: 40 } };
    render();
    expect(text()).toContain(L.promoVuaLocked);
    expect([...host.querySelectorAll('input')].some((i) => i.labels?.[0]?.textContent === L.promoInput)).toBe(false);
  });

  it('đang gói Vựa: thẻ mã nhắc mã chỉ dùng cho gói Thương lái', () => {
    sub = { ...subscriptionOf(offerOf(null)), planCode: 'vua' };
    render();
    expect(text()).toContain(L.promoVuaWarning);
  });

  it('hết kỳ ưu đãi: giá thường, không gạch ngang, báo đã dùng hết', () => {
    sub = subscriptionOf(offerOf({ ...PROMO, periodsLeft: 0 }));
    render();

    expect(host.querySelectorAll('s')).toHaveLength(0);
    expect(text()).toContain(L.promoUsedUp);
  });
});
