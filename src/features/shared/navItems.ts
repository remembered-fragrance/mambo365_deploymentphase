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

import { LEGAL_LINKS } from '@/config';
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
import { allows, isFarmer, type Access, type Gate } from './access';

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
  auth: '/dang-nhap',
  terms: LEGAL_LINKS.terms,
  privacy: LEGAL_LINKS.privacy,
  guide: LEGAL_LINKS.guide,
} as const;

/**
 * Điều kiện vào từng màn (mô hình ba vai trò). Không có trong bảng = ai cũng vào được.
 * Dùng chung cho điều hướng (ẩn mục) và cho route (chặn khi gõ thẳng đường dẫn).
 */
const BOOK: Gate = { book: true };
export const ROUTE_GATES: Readonly<Record<string, Gate>> = {
  [ROUTES.receipts]: { book: true, permission: 'receipt:create' },
  [ROUTES.create]: { book: true, permission: 'receipt:create' },
  [ROUTES.debts]: { book: true, permission: 'payment:record' },
  [ROUTES.inventory]: BOOK,
  [ROUTES.suppliers]: BOOK,
  [ROUTES.buyers]: BOOK,
  [ROUTES.products]: BOOK,
  [ROUTES.pricing]: { book: true, permission: 'pricing:manage' },
  [ROUTES.reports]: { book: true, permission: 'report:view' },
  [ROUTES.utilities]: BOOK,
  [ROUTES.plans]: { book: true, permission: 'billing:manage' },
  [ROUTES.importData]: { book: true, permission: 'partner:manage' },
};

const visible = (access: Access) => (item: NavItem): boolean => allows(access, ROUTE_GATES[item.to]);

/** Hai con số duy nhất được vẽ thành huy hiệu trên điều hướng. */
export interface NavCounts {
  readonly drafts: number;
  readonly overdue: number;
}

export const navItems = (counts: NavCounts, access: Access): NavItem[] => {
  // Vỏ Nông dân: không có sổ ⇒ thanh dưới chỉ còn Trang chủ và Tài khoản.
  if (isFarmer(access)) {
    return [
      { id: 'dashboard', label: L.navDashboard, to: ROUTES.dashboard, Icon: HomeIcon, bar: 1 },
      { id: 'profile', label: L.navProfile, to: ROUTES.profile, Icon: UserIcon, bar: 4 },
    ];
  }
  return bookBar(counts).filter(visible(access));
};

const bookBar = ({ drafts, overdue }: NavCounts): NavItem[] => [
  { id: 'dashboard', label: L.navDashboard, to: ROUTES.dashboard, Icon: HomeIcon, bar: 1 },
  {
    id: 'receipts',
    label: L.navReceipts,
    to: ROUTES.receipts,
    Icon: ReceiptIcon,
    bar: 2,
    badge: drafts,
  },
  { id: 'debts', label: L.navDebts, to: ROUTES.debts, Icon: DebtIcon, bar: 3, badge: overdue },
  { id: 'more', label: L.navMore, to: ROUTES.more, Icon: MoreIcon, bar: 4 },
];

/** Mọi mục ngoài thanh dưới — dùng cho sidebar và cho trang "Thêm" ở mobile. */
export const secondaryItems = (access: Access): NavItem[] => allSecondary().filter(visible(access));

const allSecondary = (): NavItem[] => [
  { id: 'suppliers', label: L.navSuppliers, to: ROUTES.suppliers, Icon: PhoneIcon },
  { id: 'buyers', label: L.navBuyers, to: ROUTES.buyers, Icon: PeopleIcon },
  { id: 'products', label: L.navProducts, to: ROUTES.products, Icon: TagIcon },
  { id: 'inventory', label: L.navInventory, to: ROUTES.inventory, Icon: BoxIcon },
  { id: 'pricing', label: L.navPricing, to: ROUTES.pricing, Icon: PercentIcon },
  { id: 'reports', label: L.navReports, to: ROUTES.reports, Icon: ChartIcon },
  { id: 'utilities', label: L.navUtilities, to: ROUTES.utilities, Icon: ToolIcon },
  { id: 'profile', label: L.navProfile, to: ROUTES.profile, Icon: UserIcon },
  { id: 'plans', label: L.planTitle, to: ROUTES.plans, Icon: CardIcon },
  { id: 'importData', label: L.importTitle, to: ROUTES.importData, Icon: UploadIcon },
];

const pick = (items: readonly NavItem[], ids: readonly string[]): NavItem[] =>
  ids.map((id) => items.find((i) => i.id === id)).filter((i): i is NavItem => i !== undefined);

export const navGroups = (counts: NavCounts, access: Access): NavGroup[] => {
  const bar = navItems(counts, access);
  const rest = secondaryItems(access);

  const groups: NavGroup[] = [
    { id: 'daily', label: L.groupDaily, items: pick(bar, ['dashboard', 'receipts', 'debts']) },
    { id: 'partners', label: L.groupPartners, items: pick(rest, ['suppliers', 'buyers']) },
    { id: 'goods', label: L.groupGoods, items: pick(rest, ['products', 'inventory', 'pricing']) },
    { id: 'reports', label: L.groupReports, items: pick(rest, ['reports', 'utilities']) },
    {
      id: 'account',
      label: L.groupAccount,
      items: pick(rest, ['profile', 'plans', 'importData']),
    },
  ];
  // Nhóm rỗng (người cân không có Đối tác/Hàng hoá đầy đủ, nông dân) thì bỏ hẳn tiêu đề.
  return groups.filter((g) => g.items.length > 0);
};
