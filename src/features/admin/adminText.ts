import type { Feature, MemberStatus, PlanCode, PlanSummary } from '@mambo/contracts';
import { formatDate, formatDateTime } from '@mambo/core/format';
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

/** "+84969158911" → "0969 158 911" — số ở dạng người Việt quen đọc. Số lạ giữ nguyên. */
export const phoneText = (phone: string | null | undefined): string => {
  if (!phone) return '—';
  const local = phone.startsWith('+84') ? `0${phone.slice(3)}` : phone;
  return /^0\d{9}$/.test(local) ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
};

const ACTION_TEXT: Readonly<Record<string, string>> = {
  'activate-plan': L.adminActActivate,
  'reset-password': L.adminActReset,
  'list-payments': L.adminActPayments,
  'list-organizations': L.adminActOrgs,
  'view-organization': L.adminActOrg,
  'set-feature': L.adminActFeature,
  'create-promo': L.adminActPromoCreate,
  'delete-promo': L.adminActPromoDelete,
  'search-users': L.adminActUsers,
  'list-feedback': L.adminActFeedback,
};

/** Tên việc trong nhật ký quản trị; việc lạ (bản API mới hơn) hiện nguyên mã. */
export const actionText = (action: string): string => ACTION_TEXT[action] ?? action;

const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g;

/** Mốc thời gian ISO trong ghi chú nhật ký ("2026-10-12T12:30:06.745Z → …") đổi sang ngày giờ dễ đọc. */
export const reasonText = (reason: string | null): string => (reason ? reason.replace(ISO, (iso) => formatDateTime(iso)) : '—');

const EVENT_TEXT: Readonly<Record<string, string>> = {
  app_opened: L.adminEvAppOpened,
  sign_up_completed: L.adminEvSignUp,
  login_succeeded: L.adminEvLoginOk,
  login_failed: L.adminEvLoginFailed,
  receipt_created: L.adminEvReceiptCreated,
  receipt_shared: L.adminEvReceiptShared,
  debt_payment_recorded: L.adminEvDebtPaid,
  import_completed: L.adminEvImport,
  plans_viewed: L.adminEvPlansViewed,
  checkout_started: L.adminEvCheckout,
  plan_activated: L.adminEvPlanActivated,
  quota_wall_shown: L.adminEvQuotaWall,
  locked_feature_viewed: L.adminEvLockedFeature,
  contact_clicked: L.adminEvContact,
  member_invited: L.adminEvMemberInvited,
  link_accepted: L.adminEvLinkAccepted,
  order_created: L.adminEvOrderCreated,
  order_accepted: L.adminEvOrderAccepted,
  order_scheduled: L.adminEvOrderScheduled,
  order_fulfilled: L.adminEvOrderFulfilled,
  account_deleted: L.adminEvAccountDeleted,
};

/** Tên sự kiện đo lường bằng lời thường; sự kiện lạ (bản API mới hơn) hiện nguyên mã. */
export const eventText = (name: string): string => EVENT_TEXT[name] ?? name;

export const FEATURE_TEXT: Readonly<Record<Feature, string>> = { orders: L.adminFeatureOrders, links: L.adminFeatureLinks };
