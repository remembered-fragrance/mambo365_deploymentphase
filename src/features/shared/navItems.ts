/**
 * Danh sách điều hướng thật của app.
 *
 * Mục `disabled` là màn hình của giai đoạn E — giữ chỗ để bố cục không nhảy khi
 * chúng xuất hiện, và để người dùng biết những thứ đó sắp có.
 */

import { L } from '@/i18n/labels';
import {
  DebtIcon,
  HomeIcon,
  MoreIcon,
  PhoneIcon,
  ReceiptIcon,
} from '@/components/ui/icons';
import type { NavGroup, NavItem } from '@/components/layout/navModel';

export const ROUTES = {
  dashboard: '/',
  receipts: '/phieu',
  create: '/tao-phieu',
  receiptDetail: (id: string) => `/phieu/${id}`,
} as const;

export const navItems = (draftCount: number): NavItem[] => [
  { id: 'dashboard', label: L.navDashboard, to: ROUTES.dashboard, Icon: HomeIcon, bar: 1 },
  {
    id: 'receipts',
    label: L.navReceipts,
    to: ROUTES.receipts,
    Icon: ReceiptIcon,
    bar: 2,
    badge: draftCount,
  },
  { id: 'debts', label: L.navDebts, to: '/cong-no', Icon: DebtIcon, bar: 3, disabled: true },
  { id: 'more', label: L.navMore, to: '/them', Icon: MoreIcon, bar: 4, disabled: true },
];

export const navGroups = (draftCount: number): NavGroup[] => {
  const [dashboard, receipts, debts, more] = navItems(draftCount);
  const daily = [dashboard, receipts, debts].filter((i): i is NavItem => i !== undefined);

  return [
    { id: 'daily', label: L.groupDaily, items: daily },
    {
      id: 'partners',
      label: L.groupPartners,
      items: [
        { id: 'suppliers', label: L.navSuppliers, to: '/nong-ho', Icon: PhoneIcon, disabled: true },
        { id: 'buyers', label: L.navBuyers, to: '/nguoi-mua', Icon: PhoneIcon, disabled: true },
      ],
    },
    {
      id: 'account',
      label: L.groupAccount,
      items: more ? [more] : [],
    },
  ];
};
