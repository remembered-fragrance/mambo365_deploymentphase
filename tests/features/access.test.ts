import { describe, expect, it } from 'vitest';
import { permissionsOf, type MemberRole, type OrgType } from '@mambo/contracts';
import { allows, type Access } from '@/features/shared/access';
import { navGroups, navItems, ROUTE_GATES, ROUTES, secondaryItems } from '@/features/shared/navItems';

const access = (type: OrgType, role: MemberRole): Access => ({ orgType: type, permissions: [...permissionsOf(type, role)] });
const counts = { drafts: 0, overdue: 0 };
const ids = (a: Access) => [...navItems(counts, a), ...secondaryItems(a)].map((i) => i.id);

describe('điều hướng theo mô hình ba vai trò', () => {
  it('chưa có tổ chức (sổ của máy) → thấy hết như trước', () => {
    const none: Access = { orgType: null, permissions: [] };
    expect(ids(none)).toEqual(expect.arrayContaining(['receipts', 'debts', 'pricing', 'plans', 'importData']));
  });

  it('nông dân → Trang chủ, Đơn hàng, Tài khoản; không có màn nào của sổ', () => {
    const farmer = access('farmer', 'owner');
    expect(navItems(counts, farmer).map((i) => i.id)).toEqual(['dashboard', 'orders', 'profile']);
    expect(allows(farmer, ROUTE_GATES[ROUTES.receipts])).toBe(false);
    expect(allows(farmer, ROUTE_GATES[ROUTES.plans])).toBe(false);
    expect(navGroups(counts, farmer).every((g) => g.items.length > 0)).toBe(true);
  });

  it('sổ của máy này (chưa có tổ chức): không vào Đơn hàng / Thông báo / Vựa đã kết nối', () => {
    const local = { orgType: null, permissions: [] };
    expect(allows(local, ROUTE_GATES[ROUTES.orders])).toBe(false);
    expect(allows(local, ROUTE_GATES[ROUTES.notifications])).toBe(false);
    expect(allows(local, ROUTE_GATES[ROUTES.linked])).toBe(false);
    expect(allows(local, ROUTE_GATES[ROUTES.receipts])).toBe(true);
  });

  it('chủ vựa → đủ mọi màn của sổ, kể cả Gói', () => {
    expect(ids(access('trader', 'owner'))).toEqual(
      expect.arrayContaining(['receipts', 'debts', 'pricing', 'reports', 'plans', 'importData']),
    );
  });

  it('người cân của vựa → lập phiếu, thu nợ được; không thấy giá, báo cáo, gói, nhập dữ liệu', () => {
    const staff = ids(access('trader', 'staff'));
    expect(staff).toEqual(expect.arrayContaining(['receipts', 'debts', 'suppliers', 'products']));
    for (const hidden of ['pricing', 'reports', 'plans', 'importData']) expect(staff).not.toContain(hidden);
  });

  it('quản lý doanh nghiệp → có giá và báo cáo, không có Gói', () => {
    const manager = ids(access('enterprise', 'manager'));
    expect(manager).toEqual(expect.arrayContaining(['pricing', 'reports']));
    expect(manager).not.toContain('plans');
  });
});
