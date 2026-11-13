import { describe, expect, it } from 'vitest';
import { permissionsOf, type MemberRole, type OrgType } from '@mambo/contracts';
import type { Access } from '@/features/shared/access';
import { backTarget, isTabRoot, navItems, ROUTES } from '@/features/shared/navItems';

const counts = { drafts: 0, overdue: 0 };
const items = (type: OrgType, role: MemberRole = 'owner') => {
  const access: Access = { orgType: type, permissions: [...permissionsOf(type, role)] };
  return navItems(counts, access);
};

describe('nút Quay lại khi mở thẳng từ link', () => {
  it('màn chi tiết về đúng màn danh sách của nó', () => {
    expect(backTarget('/phieu/abc', items('trader'))).toBe(ROUTES.receipts);
    expect(backTarget('/don-hang/abc', items('trader'))).toBe(ROUTES.orders);
    expect(backTarget('/don-hang/tao', items('trader'))).toBe(ROUTES.orders);
  });

  it('/vua/:id của nông dân về Trang chủ — không có route /vua', () => {
    expect(backTarget('/vua/org-1', items('farmer'))).toBe(ROUTES.dashboard);
  });

  it('màn mở từ "Thêm" về "Thêm"; vỏ không có "Thêm" thì về Trang chủ', () => {
    expect(backTarget('/nong-ho', items('trader'))).toBe(ROUTES.more);
    expect(backTarget('/ban-do/', items('trader'))).toBe(ROUTES.more);
    expect(backTarget('/thong-bao', items('farmer'))).toBe(ROUTES.dashboard);
  });

  it('tab của thanh dưới không có nút, kể cả khi có dấu / ở cuối', () => {
    expect(isTabRoot('/phieu', items('trader'))).toBe(true);
    expect(isTabRoot('/phieu/', items('trader'))).toBe(true);
    expect(isTabRoot('/phieu/abc', items('trader'))).toBe(false);
  });
});
