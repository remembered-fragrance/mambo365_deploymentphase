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
import type { PlanPrice, PlanSummary } from '@mambo/contracts';
import { api } from './client';

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
  const me = await api.me();
  const membership = me.memberships.find((m) => m.organization.id === orgId);
  if (!membership) throw new Error('Not a member of this organization');
  return subscriptionFromPlan(membership.plan);

};

/** Vựa tự mua qua chuyển khoản (`selfServe`) hay doanh nghiệp liên hệ kích hoạt; bảng giá do máy chủ giữ. */
export interface BillingOffer {
  readonly selfServe: boolean;
  readonly prices: readonly PlanPrice[];
}

/** Cần `billing:manage`. */
export const fetchBillingOffer = async (): Promise<BillingOffer> => {
  const { selfServe, prices } = await api.billing.subscription();
  return { selfServe, prices };
};

/** Lịch sử chuyển khoản, mới nhất trước (tối đa 12). Cần `billing:manage`. */
export const fetchPaymentIntents = async (): Promise<PaymentIntent[]> => (await api.billing.intents()).intents;

/**
 * Tạo ý định thanh toán — mã đối soát do MÁY CHỦ sinh. Bấm lại trong 24 giờ với cùng số tháng
 * trả đúng ý định cũ, không sinh thêm mã.
 */
export const createPaymentIntent = (months: 1 | 12): Promise<PaymentIntent> =>
  api.billing.createIntent({ months });

/** Nhập mã người mời (một lần). `false` = không dùng được — máy chủ không nói vì sao. */
export const claimReferral = async (code: string): Promise<boolean> =>
  (await api.account.claimReferral({ code })).claimed;
