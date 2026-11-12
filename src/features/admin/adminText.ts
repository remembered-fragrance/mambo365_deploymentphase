import type { Feature, MemberStatus, PlanCode, PlanSummary } from '@mambo/contracts';
import { formatDate } from '@mambo/core/format';
import { L } from '@/i18n/labels';

const TIER: Readonly<Record<PlanSummary['tier'], string>> = {
  trial: L.adminTierTrial,
  premium: L.adminTierPremium,
  grace: L.adminTierGrace,
  free: L.adminTierFree,
};

const PLAN: Readonly<Record<PlanCode, string>> = { thuong_lai: L.adminPlanThuongLai, vua: L.adminPlanVua };

export const planCodeText = (plan: PlanCode): string => PLAN[plan];

/** "Đang trả tiền · Vựa · đến 26/12/2026"; nông dân / chưa có hàng gói → "Không có gói". */
export const planText = (plan: PlanSummary | null): string => {
  if (!plan) return L.adminNoPlan;
  return [TIER[plan.tier], plan.plan ? PLAN[plan.plan] : null, plan.periodEnd ? `${L.adminUntil} ${formatDate(plan.periodEnd)}` : null]
    .filter(Boolean)
    .join(' · ');
};

export const MEMBER_STATUS_TEXT: Readonly<Record<MemberStatus, string>> = {
  active: L.adminMemberActive,
  invited: L.adminMemberInvited,
  removed: L.adminMemberRemoved,
};

export const FEATURE_TEXT: Readonly<Record<Feature, string>> = { orders: L.adminFeatureOrders, links: L.adminFeatureLinks };
