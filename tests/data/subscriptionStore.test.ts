import { beforeEach, describe, expect, it, vi } from 'vitest';

const billing = vi.hoisted(() => ({
  fetchSubscription: vi.fn(),
  fetchPaymentIntents: vi.fn(),
  fetchBillingOffer: vi.fn(),
}));
vi.mock('@/data/billing', () => billing);
vi.mock('@/data/client', () => ({ getSupabase: () => ({}) }));

const { forgetAllSubscriptions, loadSubscription, subscriptionSnapshot } = await import('@/data/subscriptionStore');

const SUB = { id: 'current-plan', status: 'active' as const, currentPeriodEnd: '2027-10-13T00:00:00.000Z' };
const INTENT = { id: 'i-1', amount: 1_490_000, status: 'pending' as const, code: 'K7M2P9', createdAt: '2026-10-13T00:00:00.000Z' };
const OFFER = { selfServe: true, prices: [{ months: 12, amount: 1_490_000 }] };

describe('subscriptionStore — gói và lịch sử chuyển khoản', () => {
  beforeEach(() => vi.clearAllMocks());

  it('người có billing:manage: tải gói, lịch sử, bảng giá', async () => {
    billing.fetchSubscription.mockResolvedValue(SUB);
    billing.fetchPaymentIntents.mockResolvedValue([INTENT]);
    billing.fetchBillingOffer.mockResolvedValue(OFFER);
    await loadSubscription('org-1', true, true);
    expect(subscriptionSnapshot('org-1')).toMatchObject({ subscription: SUB, intents: [INTENT], offer: OFFER, loading: false });
  });

  it('hỏi lại lúc mất sóng: giữ nguyên gói và lịch sử, không hạ bậc, không nháy trống', async () => {
    billing.fetchSubscription.mockRejectedValue(new TypeError('Failed to fetch'));
    billing.fetchPaymentIntents.mockRejectedValue(new TypeError('Failed to fetch'));
    billing.fetchBillingOffer.mockRejectedValue(new TypeError('Failed to fetch'));
    await loadSubscription('org-1', true, true);
    expect(subscriptionSnapshot('org-1')).toMatchObject({ subscription: SUB, intents: [INTENT], offer: OFFER });
  });

  it('không có billing:manage: không gọi API thanh toán (người khác bị 403)', async () => {
    billing.fetchSubscription.mockResolvedValue(SUB);
    await loadSubscription('org-2', true, false);
    expect(billing.fetchPaymentIntents).not.toHaveBeenCalled();
    expect(billing.fetchBillingOffer).not.toHaveBeenCalled();
  });

  it('đăng xuất: dọn mọi bản nhớ gói, kể cả tổ chức đã không còn trong danh sách; khoá khác giữ nguyên', async () => {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() { return items.size; },
      key: (i: number) => [...items.keys()][i] ?? null,
      getItem: (k: string) => items.get(k) ?? null,
      setItem: (k: string, v: string) => void items.set(k, v),
      removeItem: (k: string) => void items.delete(k),
    });
    try {
      billing.fetchSubscription.mockResolvedValue(SUB);
      await loadSubscription('org-1', true, false);
      items.set('thumua365:plan:org-da-xoa', JSON.stringify(SUB));
      items.set('thumua365:anonId', 'giu-lai');
      expect(items.has('thumua365:plan:org-1')).toBe(true);

      forgetAllSubscriptions();

      expect([...items.keys()]).toEqual(['thumua365:anonId']);
      expect(subscriptionSnapshot('org-1')).toMatchObject({ subscription: null, intents: [], loading: false });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
