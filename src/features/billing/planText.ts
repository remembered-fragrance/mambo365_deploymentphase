/**
 * Bậc gói → chữ và màu. Một chỗ duy nhất, vì cùng một trạng thái xuất hiện ở
 * ba nơi (thẻ trong Tài khoản, banner trên khung app, màn so sánh gói) và ba
 * nơi đó nói khác nhau thì người dùng không biết tin nơi nào.
 */

import type { PlanCode } from '@mambo/contracts';
import type { BadgeTone } from '@/components/ui/Badge';
import type { PlanState, PlanTier } from '@mambo/core/subscription';
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

export const PLAN_NAME: Readonly<Record<PlanCode, string>> = {
  thuong_lai: L.planNameSolo,
  vua: L.planNameVua,
};

/**
 * "Gói Vựa", "Đang dùng thử · Gói Thương lái"… Có mã gói (vựa, 0.28.0) thì nói tên gói thay cho "Gói trả phí";
 * hết hạn hẳn (`free`) thì tên gói cũ không còn nghĩa gì. Doanh nghiệp, dữ liệu mẫu: không có mã → như cũ.
 */
export const planLabel = (plan: PlanState, code: PlanCode | null = null): string => {
  if (!code || plan.tier === 'free') return TIER_LABEL[plan.tier];
  return plan.tier === 'premium' ? PLAN_NAME[code] : `${TIER_LABEL[plan.tier]} · ${PLAN_NAME[code]}`;
};
export const planTone = (plan: PlanState): BadgeTone => TIER_TONE[plan.tier];

/** "còn 12 ngày nữa" — bậc `free` không có mốc nào để đếm nên trả chuỗi rỗng. */
export const daysLeftText = (plan: PlanState): string =>
  plan.tier === 'free' ? '' : `${plan.daysLeft} ${L.planDaysLeft}`;
