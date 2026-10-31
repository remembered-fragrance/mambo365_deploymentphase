/**
 * Đọc gói dịch vụ và tạo ý định thanh toán.
 *
 * Thông tin gói lấy từ `api.me()` (`membership.plan`).
 * Không gọi PostgREST trực tiếp.
 */

import type {
  PaymentIntent,
  Subscription,
  SubscriptionStatus,
} from '@mambo/core/subscription';
import type { PaymentIntentCreateInput, PlanPrice, PlanSummary, StaffPrice, StaffTopUp } from '@mambo/contracts';
import { api, fetchMe } from './client';
import { track } from './track';

export const subscriptionFromPlan = (plan: PlanSummary | null): Subscription | null => {
  if (!plan) return null;
  return {
    id: 'current-plan',
    status: plan.status as SubscriptionStatus,
    trialEndsAt: plan.tier === 'trial' && plan.periodEnd ? plan.periodEnd : undefined,
    currentPeriodEnd: plan.periodEnd ?? undefined,
  };
};

export const fetchSubscription = async (
  _supabaseClient: unknown,
  orgId: string,
): Promise<Subscription | null> => {
  if (!orgId) throw new Error('Organization is required');
  const me = await fetchMe();
  const membership = me.memberships.find((m) => m.organization.id === orgId);
  if (!membership) throw new Error('Not a member of this organization');
  return subscriptionFromPlan(membership.plan);

};

/** Vựa tự mua qua chuyển khoản (`selfServe`) hay doanh nghiệp liên hệ kích hoạt; bảng giá do máy chủ giữ. */
export interface BillingOffer {
  readonly selfServe: boolean;
  /** Giá theo gói + số tháng — tìm bằng cả hai, không chỉ `months` (0.28.0 có hai gói cùng số tháng). */
  readonly prices: readonly PlanPrice[];
  /** Một người cân thêm cho trọn một kỳ — gói Vựa cộng `số người × amount`. */
  readonly staffPrices: readonly StaffPrice[];
  /** Mua thêm 1…n người cân ngay lúc này (theo ngày còn lại). Rỗng = không có nút mua thêm. */
  readonly staffTopUps: readonly StaffTopUp[];
}

/** Cần `billing:manage`. */
export const fetchBillingOffer = async (): Promise<BillingOffer> => {
  const { selfServe, prices, staffPrices, staffTopUps } = await api.billing.subscription();
  return { selfServe, prices, staffPrices, staffTopUps };
};

/** Lịch sử chuyển khoản, mới nhất trước (tối đa 12). Cần `billing:manage`. */
export const fetchPaymentIntents = async (): Promise<PaymentIntent[]> => (await api.billing.intents()).intents;

/**
 * Tạo ý định thanh toán — mã đối soát và số tiền do MÁY CHỦ sinh. Bấm lại trong 24 giờ với cùng gói, số tháng,
 * số người cân trả đúng ý định cũ, không sinh thêm mã.
 */
export const createPaymentIntent = async (input: PaymentIntentCreateInput): Promise<PaymentIntent> => {
  // Mua người cân không có số tháng (hết hạn cùng gói) — sự kiện chỉ nhận 1 | 12 nên ghi 1.
  track('checkout_started', { months: input.kind === 'staff' ? 1 : input.months });
  return api.billing.createIntent(input);
};

/** Nhập mã người mời (một lần). `false` = không dùng được — máy chủ không nói vì sao. */
export const claimReferral = async (code: string): Promise<boolean> =>
  (await api.account.claimReferral({ code })).claimed;
