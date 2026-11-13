import type { OrgType } from '@mambo/contracts';
import { L } from '@/i18n/labels';

export type DemoTab =
  | 'home'
  | 'orders'
  | 'connections'
  | 'receivables'
  | 'debts'
  | 'book'
  | 'inventory'
  | 'products'
  | 'pricing'
  | 'staff'
  | 'branches'
  | 'reports'
  | 'notifications'
  | 'plans';

export const ROLE_PREVIEW_OPTIONS: readonly { readonly type: OrgType; readonly label: string }[] = [
  { type: 'trader', label: L.bootstrapTraderTitle },
  { type: 'farmer', label: L.bootstrapFarmerTitle },
  { type: 'enterprise', label: L.bootstrapEnterpriseTitle },
];

export const rolePreviewTabs = (role: OrgType): readonly { readonly id: DemoTab; readonly label: string }[] => {
  const common = [
    { id: 'home' as const, label: L.navDashboard },
    { id: 'orders' as const, label: L.rolePreviewNavOrders },
    { id: 'connections' as const, label: L.rolePreviewNavConnections },
  ];
  if (role === 'farmer') {
    return [...common, { id: 'receivables', label: L.rolePreviewNavReceivables },
      { id: 'reports', label: L.rolePreviewNavReports },
      { id: 'notifications', label: L.rolePreviewNavNotifications }];
  }
  const business: { readonly id: DemoTab; readonly label: string }[] = [
    ...common,
    { id: 'book', label: L.rolePreviewNavBook },
    { id: 'debts', label: L.rolePreviewNavDebts },
    { id: 'inventory', label: L.rolePreviewNavInventory },
    { id: 'products', label: L.rolePreviewNavProducts },
    { id: 'pricing', label: L.rolePreviewNavPricing },
  ];
  if (role === 'enterprise') {
    business.push(
      { id: 'branches', label: L.rolePreviewNavBranches },
      { id: 'staff', label: L.rolePreviewNavStaff },
    );
  }
  return [...business, { id: 'reports', label: L.rolePreviewNavReports },
    { id: 'notifications', label: L.rolePreviewNavNotifications },
    { id: 'plans', label: L.rolePreviewNavPlans }];
};
