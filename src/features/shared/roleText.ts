import type { MemberRole, OrgType } from '@mambo/contracts';
import { L } from '@/i18n/labels';

export const ORG_TYPE_TEXT: Readonly<Record<OrgType, { readonly label: string; readonly hint: string }>> = {
  farmer: { label: L.orgFarmer, hint: L.orgFarmerHint },
  trader: { label: L.orgTrader, hint: L.orgTraderHint },
  enterprise: { label: L.orgEnterprise, hint: L.orgEnterpriseHint },
};

const ROLE_TEXT: Readonly<Record<MemberRole, string>> = {
  owner: L.roleOwner,
  manager: L.roleManager,
  staff: L.roleStaff,
};

/** Tên vai trò để HIỂN THỊ. Nhân viên của vựa gọi là "Người cân" (FRONTEND.md §5.4). */
export const roleText = (type: OrgType, role: MemberRole): string =>
  type === 'trader' && role === 'staff' ? L.traderStaff : ROLE_TEXT[role];
