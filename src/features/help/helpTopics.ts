/**
 * Mỗi trang một đoạn giải thích ngắn — yêu cầu "nút ? ở mọi trang" (§16.4).
 *
 * Chữ nằm ở `i18n/onboardingLabels.ts`; ở đây chỉ là bảng tra trang → đoạn chữ
 * và hình minh hoạ. Tách ra để thêm một trang mới là thêm đúng một dòng, và
 * quên thêm thì TypeScript báo ngay (Record đủ khoá).
 */

import type { ComponentType } from 'react';
import {
  BoxIcon,
  ChartIcon,
  DebtIcon,
  HomeIcon,
  PeopleIcon,
  PercentIcon,
  PlusIcon,
  ReceiptIcon,
  TagIcon,
  ToolIcon,
  UserIcon,
} from '@/components/ui/icons';
import { L } from '@/i18n/labels';

export type HelpTopic =
  | 'dashboard'
  | 'receipts'
  | 'create'
  | 'debts'
  | 'inventory'
  | 'partners'
  | 'products'
  | 'pricing'
  | 'reports'
  | 'utilities'
  | 'profile';

export interface HelpEntry {
  readonly body: string;
  readonly Icon: ComponentType<{ readonly className?: string }>;
}

export const HELP: Record<HelpTopic, HelpEntry> = {
  dashboard: { body: L.helpDashboard, Icon: HomeIcon },
  receipts: { body: L.helpReceipts, Icon: ReceiptIcon },
  create: { body: L.helpCreate, Icon: PlusIcon },
  debts: { body: L.helpDebts, Icon: DebtIcon },
  inventory: { body: L.helpInventory, Icon: BoxIcon },
  partners: { body: L.helpPartners, Icon: PeopleIcon },
  products: { body: L.helpProducts, Icon: TagIcon },
  pricing: { body: L.helpPricing, Icon: PercentIcon },
  reports: { body: L.helpReports, Icon: ChartIcon },
  utilities: { body: L.helpUtilities, Icon: ToolIcon },
  profile: { body: L.helpProfile, Icon: UserIcon },
};
