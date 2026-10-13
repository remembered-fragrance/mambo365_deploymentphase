import { describe, expect, it } from 'vitest';
import { PERMISSIONS_BY } from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { monthRange, orgErrorMessage } from '@/data/org';
import { allows } from '@/features/shared/access';
import { ROUTE_GATES, ROUTES } from '@/features/shared/navItems';
import { L } from '@/i18n/labels';

describe('monthRange — báo cáo theo tháng, giờ Việt Nam', () => {
  it('đầu tháng tới đầu tháng sau (to không gồm)', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01T00:00:00+07:00', to: '2026-11-01T00:00:00+07:00' });
  });
  it('tháng 12 sang tháng 1 năm sau', () => {
    expect(monthRange('2026-12').to).toBe('2027-01-01T00:00:00+07:00');
  });
});

describe('orgErrorMessage', () => {
  const v = (details: Record<string, unknown>) => new ApiError('VALIDATION_FAILED', 422, 'x', undefined, details);
  it('số đã có tài khoản nơi khác / đã ở trong tổ chức', () => {
    expect(orgErrorMessage(v({ reason: 'ACCOUNT_EXISTS' }))).toBe(L.memberAccountExists);
    expect(orgErrorMessage(v({ reason: 'ALREADY_MEMBER' }))).toBe(L.memberAlreadyIn);
  });
  it('vượt giới hạn chi nhánh của gói: kèm số', () => {
    expect(orgErrorMessage(new ApiError('BRANCH_LIMIT', 402, 'x', undefined, { limit: 3 }))).toBe(`${L.branchLimit} 3`);
  });
  it('lỗi ô nhập: hiện câu máy chủ gắn cho ô đó; không có ô: chi nhánh còn người', () => {
    expect(orgErrorMessage(v({ fields: { phone: 'Số điện thoại chưa đúng' } }))).toBe('Số điện thoại chưa đúng');
    expect(orgErrorMessage(v({}))).toBe(L.branchHasMembers);
  });
});

describe('ai thấy màn Nhân viên / Chi nhánh / Báo cáo tổng', () => {
  const as = (orgType: 'trader' | 'enterprise', role: 'owner' | 'manager' | 'staff') => ({
    orgType,
    permissions: PERMISSIONS_BY[orgType][role] ?? [],
  });
  const sees = (access: ReturnType<typeof as>, route: string) => allows(access, ROUTE_GATES[route]);

  it('chủ vựa: Nhân viên (thêm người cân), không có Chi nhánh / Báo cáo tổng', () => {
    expect(sees(as('trader', 'owner'), ROUTES.members)).toBe(true);
    expect(sees(as('trader', 'owner'), ROUTES.branches)).toBe(false);
    expect(sees(as('trader', 'owner'), ROUTES.orgReport)).toBe(false);
  });
  it('chủ doanh nghiệp: đủ ba màn; quản lý: chỉ Báo cáo tổng; nhân viên: không màn nào', () => {
    expect([ROUTES.members, ROUTES.branches, ROUTES.orgReport].map((r) => sees(as('enterprise', 'owner'), r))).toEqual([true, true, true]);
    expect([ROUTES.members, ROUTES.branches, ROUTES.orgReport].map((r) => sees(as('enterprise', 'manager'), r))).toEqual([false, false, true]);
    expect([ROUTES.members, ROUTES.branches, ROUTES.orgReport].map((r) => sees(as('enterprise', 'staff'), r))).toEqual([false, false, false]);
  });
});
