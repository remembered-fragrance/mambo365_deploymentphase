import type { OrgType, PlanCode } from '@mambo/contracts';
import { L } from '@/i18n/labels';

export interface SetupChoice {
  /** Khoá của thẻ — hai thẻ Thương lái / Vựa cùng `type: 'trader'`. */
  readonly key: string;
  readonly type: OrgType;
  /** Gói vựa gửi kèm `bootstrap` (0.28.0); bỏ trống với nông dân, doanh nghiệp. */
  readonly plan?: PlanCode;
  readonly label: string;
  readonly hint: string;
}

/**
 * Các thẻ của bước "Bạn là ai?". Tài khoản vựa tách hai thẻ theo gói (yêu cầu 30/10/2026) nhưng vẫn là một loại
 * `trader` — chỉ ghi thêm gói, vì `trader` đang dùng ở kết nối, bản đồ, đơn hàng.
 */
export const SETUP_CHOICES: readonly SetupChoice[] = [
  { key: 'farmer', type: 'farmer', label: L.orgFarmer, hint: L.orgFarmerHint },
  { key: 'thuong_lai', type: 'trader', plan: 'thuong_lai', label: L.orgSolo, hint: L.orgSoloHint },
  { key: 'vua', type: 'trader', plan: 'vua', label: L.orgVua, hint: L.orgVuaHint },
  { key: 'enterprise', type: 'enterprise', label: L.orgEnterprise, hint: L.orgEnterpriseHint },
];

/** Nông dân không có ô tên tổ chức: tên hộ suy từ tên hiển thị. */
export const asksOrgName = (orgType: OrgType | null): orgType is Exclude<OrgType, 'farmer'> =>
  orgType !== null && orgType !== 'farmer';

const FARMER_PREFIX = 'Hộ';

/**
 * `orgName` gửi cho `bootstrap` (bắt buộc ở API). Nông dân: "Hộ " + tên hiển thị,
 * không thêm lần nữa nếu bạn đã tự gõ "Hộ cô Mai". Tên trống ⇒ trả rỗng để API
 * báo lỗi ở ô tên, không tạo hộ tên "Hộ".
 */
export const orgNameFor = (orgType: OrgType, orgName: string, name: string): string => {
  if (asksOrgName(orgType)) return orgName.trim();
  const display = name.trim();
  if (!display) return '';
  return display.toLocaleLowerCase('vi').startsWith(`${FARMER_PREFIX.toLocaleLowerCase('vi')} `)
    ? display
    : `${FARMER_PREFIX} ${display}`;
};

/**
 * Ô bắt buộc còn trống, báo ngay ở máy. Để máy chủ bắt thì câu lỗi là câu gốc tiếng Anh của zod
 * ("Too small: expected string…") — người dùng không đọc được.
 */
export const emptyFields = (
  orgType: OrgType,
  orgName: string,
  name: string,
): Partial<Record<'orgName' | 'name', string>> => ({
  ...(asksOrgName(orgType) && !orgName.trim() ? { orgName: L.nameRequired } : {}),
  ...(!name.trim() ? { name: L.nameRequired } : {}),
});
