import type { OrgType } from '@mambo/contracts';

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
