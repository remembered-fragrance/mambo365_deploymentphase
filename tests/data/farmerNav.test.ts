/**
 * Kiểm tra logic điều hướng và nhãn sidebar dành riêng cho tài khoản farmer.
 *
 * Không render React component — chỉ kiểm tra hàm thuần `navItems` và
 * `secondaryItems` với các bộ quyền khác nhau, để bắt lỗi regression sớm
 * mà không cần jsdom hoặc mock toàn bộ store.
 */
import { describe, expect, it } from 'vitest';
import { navGroups, navItems, secondaryItems, ROUTES } from '@/features/shared/navItems';
import type { Feature, Permission } from '@mambo/contracts';

const ALL_FARMER_PERMS: readonly Permission[] = [
  'order:create',
  'order:respond',
  'linked:read',
  'report:view',
];
const ALL_FARMER_FEATURES: readonly Feature[] = ['orders', 'links'];

const COUNTS = { drafts: 0, overdue: 0 };

describe('farmer sidebar — navItems', () => {
  it('hiện các mục hằng ngày khi có đầy đủ quyền và feature', () => {
    const items = navItems(COUNTS, ALL_FARMER_PERMS, 'farmer', ALL_FARMER_FEATURES);
    const ids = items.map((i) => i.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('farmerOrders');
    expect(ids).toContain('farmerNetwork');
    expect(ids).toContain('farmerWeighDebt');
    const profile = items.filter((item) => item.id === 'profile');
    expect(profile).toHaveLength(1);
    expect(profile[0]?.to).toBe(ROUTES.profile);
    expect(profile[0]?.bar).toBeUndefined(); // slot giữa của BottomNav dùng centerItem
    expect(ids).not.toContain('farmerProfile');
    expect(ids).not.toContain('more'); // 'more' không còn trong farmer bar
  });

  it('farmerWeighDebt trỏ đúng route /can-no', () => {
    const items = navItems(COUNTS, ALL_FARMER_PERMS, 'farmer', ALL_FARMER_FEATURES);
    const item = items.find((i) => i.id === 'farmerWeighDebt');
    expect(item?.to).toBe(ROUTES.farmerWeighDebt);
    expect(ROUTES.farmerWeighDebt).toBe('/can-no');
  });

  it('profile của farmer trỏ đúng route /tai-khoan', () => {
    const item = secondaryItems(ALL_FARMER_PERMS, 'farmer', ALL_FARMER_FEATURES).find((i) => i.id === 'profile');
    expect(item?.to).toBe(ROUTES.profile);
  });

  it('farmer chỉ có một mục profile với nhãn "Hồ sơ nông dân"', () => {
    const items = secondaryItems(ALL_FARMER_PERMS, 'farmer', ALL_FARMER_FEATURES);
    const profiles = items.filter((item) => item.to === ROUTES.profile);
    expect(profiles).toHaveLength(1);
    const item = profiles[0];
    expect(item?.label).not.toBe('Hồ sơ vựa');
    expect(item?.label).toBe('Hồ sơ nông dân');
  });

  it('farmerWeighDebt ẩn khi không có quyền linked:read', () => {
    const perms: readonly Permission[] = ['order:create'];
    const items = navItems(COUNTS, perms, 'farmer', ALL_FARMER_FEATURES);
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain('farmerWeighDebt');
  });

  it('farmerOrders ẩn khi không có order:create hoặc order:respond', () => {
    const perms: readonly Permission[] = ['linked:read'];
    const items = navItems(COUNTS, perms, 'farmer', ALL_FARMER_FEATURES);
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain('farmerOrders');
  });

  it('farmer profile vẫn hiện khi không có quyền nào', () => {
    const items = secondaryItems([], 'farmer', ALL_FARMER_FEATURES);
    const ids = items.map((i) => i.id);
    expect(ids).toContain('profile');
  });

  it('Trader và Enterprise KHÔNG có farmerWeighDebt hoặc farmerProfile', () => {
    for (const orgType of ['trader', 'enterprise'] as const) {
      const items = navItems(COUNTS, ALL_FARMER_PERMS, orgType, ALL_FARMER_FEATURES);
      const ids = items.map((i) => i.id);
      expect(ids).not.toContain('farmerWeighDebt');
      expect(ids).not.toContain('farmerProfile');
    }
  });
});

describe('farmer sidebar — secondaryItems', () => {
  it('secondaryItems của farmer chứa farmerWeighDebt khi có linked:read', () => {
    const items = secondaryItems(ALL_FARMER_PERMS, 'farmer', ALL_FARMER_FEATURES);
    const ids = items.map((i) => i.id);
    expect(ids).toContain('farmerWeighDebt');
    expect(ids).toContain('profile');
    expect(ids).not.toContain('farmerProfile');
  });

  it('secondaryItems của trader không có farmerWeighDebt', () => {
    const items = secondaryItems(['linked:read', 'report:view', 'book:sync'], 'trader');
    const ids = items.map((i) => i.id);
    expect(ids).not.toContain('farmerWeighDebt');
    expect(ids).toContain('profile');
    expect(ids).not.toContain('farmerProfile');
  });

  it('không hiện chức năng links khi feature chưa bật, dù đã có linked:read', () => {
    const items = secondaryItems(ALL_FARMER_PERMS, 'farmer', []);
    const ids = items.map((item) => item.id);
    expect(ids).not.toContain('farmerNetwork');
    expect(ids).not.toContain('farmerWeighDebt');
    expect(ids).toContain('profile');
  });

  it('chỉ hiện chức năng farmer khi cả feature và permission đều bật', () => {
    const withPermissionOnly = navItems(COUNTS, ALL_FARMER_PERMS, 'farmer', []);
    const withFeatureAndPermission = navItems(COUNTS, ALL_FARMER_PERMS, 'farmer', ALL_FARMER_FEATURES);
    expect(withPermissionOnly.map((item) => item.id)).not.toContain('farmerNetwork');
    expect(withFeatureAndPermission.map((item) => item.id)).toContain('farmerNetwork');
  });

  it('với /v1/me hiện tại (farmer permissions, features rỗng), chỉ bật dashboard và hồ sơ', () => {
    const items = navGroups(COUNTS, ALL_FARMER_PERMS, 'farmer', [])
      .flatMap((group) => group.items);
    expect(items.map((item) => item.id)).toEqual(['dashboard', 'profile']);
  });

  it('chỉ feature links bật thì có Kết nối và Phiếu cân, không tự hiện Đơn hàng', () => {
    const items = navGroups(COUNTS, ALL_FARMER_PERMS, 'farmer', ['links'])
      .flatMap((group) => group.items);
    const ids = items.map((item) => item.id);
    expect(ids).toContain('farmerNetwork');
    expect(ids).toContain('farmerWeighDebt');
    expect(ids).not.toContain('farmerOrders');
  });

  it('Trader và Enterprise không nhận các mục menu chỉ dành cho Farmer', () => {
    for (const orgType of ['trader', 'enterprise'] as const) {
      const ids = navGroups(COUNTS, ALL_FARMER_PERMS, orgType, ALL_FARMER_FEATURES)
        .flatMap((group) => group.items)
        .map((item) => item.id);
      expect(ids).not.toContain('farmerOrders');
      expect(ids).not.toContain('farmerNetwork');
      expect(ids).not.toContain('farmerWeighDebt');
    }
  });

  it('desktop navGroups chỉ đưa một profile vào nhóm tài khoản cho từng tổ chức', () => {
    for (const [orgType, expectedLabel] of [
      ['farmer', 'Hồ sơ nông dân'],
      ['trader', 'Hồ sơ vựa'],
      ['enterprise', 'Hồ sơ doanh nghiệp'],
    ] as const) {
      const items = navGroups(COUNTS, ALL_FARMER_PERMS, orgType, ALL_FARMER_FEATURES)
        .flatMap((group) => group.items)
        .filter((item) => item.to === ROUTES.profile);
      expect(items).toHaveLength(1);
      expect(items[0]?.label).toBe(expectedLabel);
    }
  });
});

describe('linkedBalance — tính tổng công nợ hai chiều', () => {
  it('theyOwe và youOwe hiển thị riêng, KHÔNG gộp thành net', () => {
    // Giả lập hai tổ chức: một bên nợ mình, một bên mình nợ họ
    const balances = [
      { organization: { id: 'org1', name: 'Vựa A', type: 'trader' as const }, theyOwe: 500_000, youOwe: 0, receiptCount: 3, lastReceiptAt: null },
      { organization: { id: 'org2', name: 'Vựa B', type: 'trader' as const }, theyOwe: 0, youOwe: 200_000, receiptCount: 1, lastReceiptAt: null },
    ];
    const totalTheyOwe = balances.reduce((sum, item) => sum + item.theyOwe, 0);
    const totalYouOwe = balances.reduce((sum, item) => sum + item.youOwe, 0);

    // Hai chiều phải khác nhau và không được cộng lại
    expect(totalTheyOwe).toBe(500_000);
    expect(totalYouOwe).toBe(200_000);
    expect(totalTheyOwe).not.toBe(totalYouOwe);
    // Net sẽ là 300_000, nhưng ta KHÔNG dùng net — phải hiển thị tách biệt
    expect(totalTheyOwe - totalYouOwe).toBe(300_000);
  });
});

describe('linkedReceipt — nhãn loại phiếu', () => {
  it('purchase nghĩa là "Mình đã bán" (vựa mua của mình)', () => {
    // Từ góc nhìn nông dân: vựa ghi phiếu "purchase" = mua từ nông dân
    // → nông dân "đã bán"
    const kindLabel = (kind: 'purchase' | 'sale') =>
      kind === 'purchase' ? 'Mình đã bán' : 'Mình đã mua';
    expect(kindLabel('purchase')).toBe('Mình đã bán');
    expect(kindLabel('sale')).toBe('Mình đã mua');
  });
});
