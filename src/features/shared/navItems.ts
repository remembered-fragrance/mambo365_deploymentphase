/**
 * Danh sách điều hướng thật của app.
 *
 * Giai đoạn E mở hết các mục còn để mờ ở giai đoạn D. Vị trí trên thanh dưới
 * vẫn khai báo bằng `bar: 1|2|3|4` — thêm mục mới không được làm nút quen
 * thuộc nhảy chỗ.
 *
 * Thứ tự nhóm trong sidebar bám ma trận parity §6.3: việc làm hằng ngày trên
 * cùng, cấu hình xuống dưới.
 */

import { L } from '@/i18n/labels';
import {
  BoxIcon,
  CardIcon,
  ChartIcon,
  DebtIcon,
  HomeIcon,
  MoreIcon,
  PeopleIcon,
  PercentIcon,
  PhoneIcon,
  ReceiptIcon,
  TagIcon,
  ToolIcon,
  UploadIcon,
  UserIcon,
} from '@/components/ui/icons';
import type { NavGroup, NavItem } from '@/components/layout/navModel';
import type { Feature, OrgType, Permission } from '@mambo/contracts';
import { profileTitle } from '@/i18n/profileLabels';

export const ROUTES = {
  dashboard: '/',
  receipts: '/phieu',
  create: '/tao-phieu',
  receiptDetail: (id: string) => `/phieu/${id}`,
  debts: '/cong-no',
  inventory: '/ton-kho',
  suppliers: '/nong-ho',
  buyers: '/nguoi-mua',
  products: '/mat-hang',
  pricing: '/quy-tac-gia',
  reports: '/bao-cao',
  utilities: '/tien-ich',
  profile: '/tai-khoan',
  plans: '/goi-dich-vu',
  importData: '/nhap-du-lieu',
  more: '/them',
  farmerOrders: '/don-hang',
  farmerNetwork: '/ket-noi',
  farmerWeighDebt: '/can-no',
  auth: '/dang-nhap',
} as const;

/** Hai con số duy nhất được vẽ thành huy hiệu trên điều hướng. */
export interface NavCounts {
  readonly drafts: number;
  readonly overdue: number;
}

export const navItems = (
  { drafts, overdue }: NavCounts,
  permissions: readonly Permission[] = [],
  orgType: OrgType | null = null,
  features: readonly Feature[] = [],
): NavItem[] => {
  if (orgType === 'farmer') {
    return [
      { id: 'dashboard', label: L.navDashboard, to: ROUTES.dashboard, Icon: HomeIcon, bar: 1 },
      ...(features.includes('orders') && (permissions.includes('order:create') || permissions.includes('order:respond')) ? [{ id: 'farmerOrders', label: L.farmerOrders, to: ROUTES.farmerOrders, Icon: ReceiptIcon, bar: 2 as const }] : []),
      ...(features.includes('links') && permissions.includes('linked:read') ? [{ id: 'farmerNetwork', label: L.farmerNetworkShort, to: ROUTES.farmerNetwork, Icon: PeopleIcon, bar: 3 as const }] : []),
      ...(features.includes('links') && permissions.includes('linked:read') ? [{ id: 'farmerWeighDebt', label: L.farmerWeighDebtTitle, to: ROUTES.farmerWeighDebt, Icon: DebtIcon, bar: 4 as const }] : []),
      { id: 'profile', label: profileTitle(orgType), to: ROUTES.profile, Icon: UserIcon },
    ];
  }
  const items: NavItem[] = [
    { id: 'dashboard', label: L.navDashboard, to: ROUTES.dashboard, Icon: HomeIcon, bar: 1 },
    { id: 'receipts', label: L.navReceipts, to: ROUTES.receipts, Icon: ReceiptIcon, bar: 2, badge: drafts },
    { id: 'debts', label: L.navDebts, to: ROUTES.debts, Icon: DebtIcon, bar: 3, badge: overdue },
    { id: 'more', label: L.navMore, to: ROUTES.more, Icon: MoreIcon, bar: 4 },
  ];
  return items.filter((item) => {
  if (item.id === 'dashboard' || item.id === 'more') return true;
  if (item.id === 'receipts') return permissions.includes('book:sync');
  if (item.id === 'debts') return permissions.includes('book:sync');
  return false;
  });
};

/** Mọi mục ngoài thanh dưới — dùng cho sidebar và cho trang "Thêm" ở mobile. */
export const secondaryItems = (
  permissions: readonly Permission[] = [],
  orgType: OrgType | null = null,
  features: readonly Feature[] = [],
): NavItem[] => [
  { id: 'suppliers', label: L.navSuppliers, to: ROUTES.suppliers, Icon: PhoneIcon },
  { id: 'buyers', label: L.navBuyers, to: ROUTES.buyers, Icon: PeopleIcon },
  { id: 'products', label: L.navProducts, to: ROUTES.products, Icon: TagIcon },
  { id: 'inventory', label: L.navInventory, to: ROUTES.inventory, Icon: BoxIcon },
  { id: 'pricing', label: L.navPricing, to: ROUTES.pricing, Icon: PercentIcon },
  { id: 'reports', label: L.navReports, to: ROUTES.reports, Icon: ChartIcon },
  { id: 'utilities', label: L.navUtilities, to: ROUTES.utilities, Icon: ToolIcon },
  { id: 'profile', label: profileTitle(orgType), to: ROUTES.profile, Icon: UserIcon },
  { id: 'plans', label: L.planTitle, to: ROUTES.plans, Icon: CardIcon },
  { id: 'importData', label: L.importTitle, to: ROUTES.importData, Icon: UploadIcon },
  { id: 'farmerOrders', label: L.farmerOrders, to: ROUTES.farmerOrders, Icon: ReceiptIcon },
  { id: 'farmerNetwork', label: L.farmerNetworkTitle, to: ROUTES.farmerNetwork, Icon: PeopleIcon },
  { id: 'farmerWeighDebt', label: L.farmerWeighDebtTitle, to: ROUTES.farmerWeighDebt, Icon: DebtIcon },
].filter((item) => {
  switch (item.id) {
    case 'farmerOrders': return orgType === 'farmer' && features.includes('orders') && (permissions.includes('order:create') || permissions.includes('order:respond'));
    case 'farmerNetwork': return orgType === 'farmer' && features.includes('links') && permissions.includes('linked:read');
    case 'farmerWeighDebt': return orgType === 'farmer' && features.includes('links') && permissions.includes('linked:read');
    case 'suppliers':
    case 'buyers': return permissions.includes('partner:manage') && (orgType === 'trader' || orgType === 'enterprise');
    case 'products':
    case 'inventory': return permissions.includes('book:sync');
    case 'pricing': return permissions.includes('pricing:manage');
    case 'reports': return permissions.includes('report:view') && orgType !== 'farmer';
    case 'plans': return orgType !== 'farmer' && permissions.includes('billing:manage');
    case 'importData': return permissions.includes('book:sync') && (permissions.includes('staff:manage') || orgType === 'trader');
    case 'utilities': return permissions.includes('book:sync');
    case 'profile': return true;
    default: return false;
  }
});

const pick = (items: readonly NavItem[], ids: readonly string[]): NavItem[] =>
  ids.map((id) => items.find((i) => i.id === id)).filter((i): i is NavItem => i !== undefined);

export const navGroups = (
  counts: NavCounts,
  permissions: readonly Permission[] = [],
  orgType: OrgType | null = null,
  features: readonly Feature[] = [],
): NavGroup[] => {
  const bar = navItems(counts, permissions, orgType, features);
  const rest = secondaryItems(permissions, orgType, features);

  return [
    { id: 'daily', label: L.groupDaily, items: pick(bar, ['dashboard', 'receipts', 'debts', 'farmerOrders', 'farmerNetwork', 'farmerWeighDebt']) },
    { id: 'partners', label: L.groupPartners, items: pick(rest, ['suppliers', 'buyers']) },
    { id: 'goods', label: L.groupGoods, items: pick(rest, ['products', 'inventory', 'pricing']) },
    { id: 'reports', label: L.groupReports, items: pick(rest, ['reports', 'utilities']) },
    {
      id: 'account',
      label: L.groupAccount,
      items: pick(rest, ['profile', 'plans', 'importData']),
    },
  ].filter((group) => group.items.length > 0);
};
