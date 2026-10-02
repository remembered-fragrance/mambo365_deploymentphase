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
} from '@/core/subscription';
import type { PlanSummary } from '@mambo/contracts';
import { FeatureUnavailableError } from './capabilities';
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

/** Lịch sử thanh toán hiện trong màn Tài khoản. BE6 sẽ cung cấp endpoint GET /v1/billing/intents. */
export const fetchPaymentIntents = async (
  _supabaseClient: unknown,
  _userId: string,
  _limit = 12,
): Promise<PaymentIntent[]> => {
  throw new FeatureUnavailableError('Billing history');
};

/**
 * Tạo ý định thanh toán và sinh mã đối soát.
 * BE6 sẽ cung cấp endpoint POST /v1/billing/intents.
 */
export const createPaymentIntent = async (
  _supabaseClient: unknown,
  _userId: string,
  _subscriptionId: string | null,
  _amount: number,
): Promise<PaymentIntent> => {
  throw new FeatureUnavailableError('Billing intents');
};

/**
 * Ghi nhận người mời. BE6 sẽ cung cấp endpoint POST /v1/referrals/claim.
 */
export const claimReferral = async (
  _supabaseClient: unknown,
  _code: string,
): Promise<boolean> => {
  throw new FeatureUnavailableError('Referral');
};
