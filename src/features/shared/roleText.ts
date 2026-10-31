import type { MemberRole, OrgType, PlanCode } from '@mambo/contracts';
import { L } from '@/i18n/labels';

export const ORG_TYPE_TEXT: Readonly<Record<OrgType, { readonly label: string; readonly hint: string }>> = {
  farmer: { label: L.orgFarmer, hint: L.orgFarmerHint },
  trader: { label: L.orgTrader, hint: L.orgTraderHint },
  enterprise: { label: L.orgEnterprise, hint: L.orgEnterpriseHint },
};

const TRADER_PLAN_TEXT: Readonly<Record<PlanCode, string>> = {
  thuong_lai: L.orgSolo,
  vua: L.orgVua,
};

/**
 * Loại tài khoản để HIỂN THỊ. Tài khoản vựa (`trader`) đăng ký theo gói Thương lái / Vựa (0.28.0) — ghi đúng gói
 * đang có; chưa biết gói (dữ liệu mẫu, chưa tải `/v1/me`) thì nhãn chung "Thương lái / Vựa".
 */
export const orgTypeText = (type: OrgType, plan: PlanCode | null | undefined): string =>
  type === 'trader' && plan ? TRADER_PLAN_TEXT[plan] : ORG_TYPE_TEXT[type].label;

const ROLE_TEXT: Readonly<Record<MemberRole, string>> = {
  owner: L.roleOwner,
  manager: L.roleManager,
  staff: L.roleStaff,
};

/** Tên vai trò để HIỂN THỊ. Nhân viên của vựa gọi là "Người cân" (FRONTEND.md §5.4). */
export const roleText = (type: OrgType, role: MemberRole): string =>
  type === 'trader' && role === 'staff' ? L.traderStaff : ROLE_TEXT[role];
