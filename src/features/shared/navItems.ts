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

import { LEGAL_LINKS, MAIL_LINKS } from '@/config';
import { L } from '@/i18n/labels';
import {
  BoxIcon,
  CardIcon,
  ChartIcon,
  DebtIcon,
  HomeIcon,
  MapIcon,
  MoreIcon,
  PackageIcon,
  PeopleIcon,
  PercentIcon,
  PhoneIcon,
  PinIcon,
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
  orders: '/don-hang',
  orderCreate: '/don-hang/tao',
  orderDetail: (id: string) => `/don-hang/${id}`,
  notifications: '/thong-bao',
  members: '/nhan-vien',
  branches: '/chi-nhanh',
  orgReport: '/bao-cao-tong',
  linked: '/vua',
  connect: '/ket-noi',
  map: '/ban-do',
  myPlaces: '/dia-diem',
  linkedTrader: (orgId: string) => `/vua/${orgId}`,
  more: '/them',
  auth: '/dang-nhap',
  terms: LEGAL_LINKS.terms,
  privacy: LEGAL_LINKS.privacy,
  guide: LEGAL_LINKS.guide,
  resetPassword: MAIL_LINKS.resetPassword,
  confirmEmail: MAIL_LINKS.confirmEmail,
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
  [ROUTES.linked]: { org: true, permission: 'linked:read' },
  [ROUTES.connect]: { org: true, permission: 'linked:read' },
  [ROUTES.orders]: { org: true },
  [ROUTES.orderCreate]: { org: true, permission: 'order:create' },
  [ROUTES.notifications]: { org: true },
  [ROUTES.members]: { org: true, permission: 'staff:manage' },
  [ROUTES.branches]: { org: true, enterprise: true, permission: 'branch:manage' },
  [ROUTES.orgReport]: { org: true, enterprise: true, permission: 'report:view' },
  // Bản đồ: cần máy chủ; xem thì mọi vai trò, đặt địa điểm thì `place:manage`.
  [ROUTES.map]: { org: true },
  [ROUTES.myPlaces]: { org: true, permission: 'place:manage' },
};

/**
 * Màn cha của màn chi tiết — nút Quay lại dùng khi mở thẳng từ link (không có lịch sử trong app).
 * Khai báo tường minh: suy từ chuỗi đường dẫn thì `/vua/:id` ra `/vua`, route không tồn tại.
 */
const DETAIL_PARENT: readonly (readonly [RegExp, string])[] = [
  [/^\/phieu\/[^/]+$/, ROUTES.receipts],
  [/^\/don-hang\/[^/]+$/, ROUTES.orders],
  // Mở từ thẻ vựa ở Trang chủ của nông dân.
  [/^\/vua\/[^/]+$/, ROUTES.dashboard],
];

const trimSlash = (pathname: string): string => pathname.replace(/\/+$/, '') || '/';

/** Đang ở một mục của thanh dưới — không cần nút Quay lại. `/phieu/` cũng là tab Phiếu. */
export const isTabRoot = (pathname: string, items: readonly NavItem[]): boolean =>
  items.some((item) => item.to === trimSlash(pathname));

/** Nơi nút Quay lại về khi không có lịch sử trong app: màn cha nếu có, không thì "Thêm" (hoặc Trang chủ). */
export const backTarget = (pathname: string, items: readonly NavItem[]): string => {
  const path = trimSlash(pathname);
  const parent = DETAIL_PARENT.find(([pattern]) => pattern.test(path))?.[1];
  if (parent) return parent;
  return items.some((item) => item.to === ROUTES.more) ? ROUTES.more : ROUTES.dashboard;
};

const visible = (access: Access) => (item: NavItem): boolean => allows(access, ROUTE_GATES[item.to]);

/** Hai con số duy nhất được vẽ thành huy hiệu trên điều hướng. */
export interface NavCounts {
  readonly drafts: number;
  readonly overdue: number;
}

export const navItems = (counts: NavCounts, access: Access): NavItem[] => {
  // Vỏ Nông dân: không có sổ ⇒ thanh dưới có Trang chủ, Đơn hàng, Bản đồ (tìm vựa gần), Tài khoản.
  if (isFarmer(access)) {
    return [
      { id: 'dashboard', label: L.navDashboard, to: ROUTES.dashboard, Icon: HomeIcon, bar: 1 },
      { id: 'orders', label: L.navOrders, to: ROUTES.orders, Icon: PackageIcon, bar: 2 },
      { id: 'map', label: L.navMap, to: ROUTES.map, Icon: MapIcon, bar: 3 },
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
  { id: 'orders', label: L.navOrders, to: ROUTES.orders, Icon: PackageIcon },
  { id: 'map', label: L.navMap, to: ROUTES.map, Icon: MapIcon },
  { id: 'suppliers', label: L.navSuppliers, to: ROUTES.suppliers, Icon: PhoneIcon },
  { id: 'buyers', label: L.navBuyers, to: ROUTES.buyers, Icon: PeopleIcon },
  { id: 'products', label: L.navProducts, to: ROUTES.products, Icon: TagIcon },
  { id: 'inventory', label: L.navInventory, to: ROUTES.inventory, Icon: BoxIcon },
  { id: 'pricing', label: L.navPricing, to: ROUTES.pricing, Icon: PercentIcon },
  { id: 'reports', label: L.navReports, to: ROUTES.reports, Icon: ChartIcon },
  { id: 'utilities', label: L.navUtilities, to: ROUTES.utilities, Icon: ToolIcon },
  { id: 'profile', label: L.navProfile, to: ROUTES.profile, Icon: UserIcon },
  { id: 'members', label: L.navMembers, to: ROUTES.members, Icon: PeopleIcon },
  { id: 'branches', label: L.navBranches, to: ROUTES.branches, Icon: HomeIcon },
  { id: 'myPlaces', label: L.navMyPlaces, to: ROUTES.myPlaces, Icon: PinIcon },
  { id: 'orgReport', label: L.navOrgReport, to: ROUTES.orgReport, Icon: ChartIcon },
  { id: 'plans', label: L.planTitle, to: ROUTES.plans, Icon: CardIcon },
  { id: 'importData', label: L.importTitle, to: ROUTES.importData, Icon: UploadIcon },
];

const pick = (items: readonly NavItem[], ids: readonly string[]): NavItem[] =>
  ids.map((id) => items.find((i) => i.id === id)).filter((i): i is NavItem => i !== undefined);

export const navGroups = (counts: NavCounts, access: Access): NavGroup[] => {
  const bar = navItems(counts, access);
  const rest = secondaryItems(access);

  const groups: NavGroup[] = [
    {
      id: 'daily',
      label: L.groupDaily,
      items: [...pick(bar, ['dashboard', 'receipts', 'debts']), ...pick(rest, ['orders', 'map'])],
    },
    { id: 'partners', label: L.groupPartners, items: pick(rest, ['suppliers', 'buyers']) },
    { id: 'goods', label: L.groupGoods, items: pick(rest, ['products', 'inventory', 'pricing']) },
    { id: 'reports', label: L.groupReports, items: pick(rest, ['orgReport', 'reports', 'utilities']) },
    {
      id: 'account',
      label: L.groupAccount,
      items: pick(rest, ['profile', 'members', 'branches', 'myPlaces', 'plans', 'importData']),
    },
  ];
  // Nhóm rỗng (người cân không có Đối tác/Hàng hoá đầy đủ, nông dân) thì bỏ hẳn tiêu đề.
  return groups.filter((g) => g.items.length > 0);
};

/** Trang "Thêm" ở điện thoại: đúng các nhóm của sidebar, bỏ mục đã nằm trên thanh dưới (số huy hiệu vì thế không cần). */
export const moreGroups = (access: Access): NavGroup[] => {
  const counts = { drafts: 0, overdue: 0 };
  const onBar = new Set(navItems(counts, access).map((item) => item.id));
  return navGroups(counts, access)
    .map((g) => ({ ...g, items: g.items.filter((item) => !onBar.has(item.id)) }))
    .filter((g) => g.items.length > 0);
};
