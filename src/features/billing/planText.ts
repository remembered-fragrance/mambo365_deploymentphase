/**
 * Bậc gói → chữ và màu. Một chỗ duy nhất, vì cùng một trạng thái xuất hiện ở
 * ba nơi (thẻ trong Tài khoản, banner trên khung app, màn so sánh gói) và ba
 * nơi đó nói khác nhau thì người dùng không biết tin nơi nào.
 */

import type { BadgeTone } from '@/components/ui/Badge';
import type { PlanState, PlanTier } from '@/core/subscription';
import { L } from '@/i18n/labels';

const TIER_LABEL: Record<PlanTier, string> = {
  trial: L.planTrial,
  premium: L.planPremium,
  grace: L.planGrace,
  free: L.planFree,
};

const TIER_TONE: Record<PlanTier, BadgeTone> = {
  trial: 'receivable',
  premium: 'in',
  grace: 'alert',
  free: 'neutral',
};

export const planLabel = (plan: PlanState): string => TIER_LABEL[plan.tier];
export const planTone = (plan: PlanState): BadgeTone => TIER_TONE[plan.tier];

/** "còn 12 ngày nữa" — bậc `free` không có mốc nào để đếm nên trả chuỗi rỗng. */
export const daysLeftText = (plan: PlanState): string =>
  plan.tier === 'free' ? '' : `${plan.daysLeft} ${L.planDaysLeft}`;
