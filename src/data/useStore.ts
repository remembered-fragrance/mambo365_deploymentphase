/**
 * Cửa DUY NHẤT để màn hình chạm tầng dữ liệu.
 *
 * 🔴 Chữ ký 22 action của bản demo KHÔNG ĐỔI.
 * Thêm các trường tổ chức, vai trò và bootstrap theo hợp đồng @mambo/contracts.
 */

import { createContext, useContext } from 'react';
import type { DraftInput } from '@/core/draftActions';
import type { NewProduct } from '@/core/productActions';
import type { NewTransaction } from '@/core/receiptActions';
import type { ReceiptImport, SupplierImport } from '@/core/sheetImport';
import type {
  AppData,
  AppSettings,
  Buyer,
  DraftReceipt,
  Note,
  Payment,
  PricingRule,
  Product,
  Supplier,
  SyncStatus,
  Transaction,
  UserProfile,
} from '@/core/types';
import type {
  Feature,
  Me,
  MeBootstrapInput,
  MeMembership,
  MemberRole,
  OrgType,
  Permission,
  PlanSummary,
} from '@mambo/contracts';
import type { ProfilePatch, SignUpInput } from './auth';

export interface StoreValue {
  readonly data: AppData;
  /** Trạng thái đồng bộ để giao diện vẽ thanh "đang chờ gửi", "lỗi mạng"… */
  readonly status: SyncStatus;
  readonly user: UserProfile | null;

  // ─── Tổ chức, vai trò và bootstrap (Hợp đồng backend Thumua365_BE) ─────────
  readonly me: Me | null;
  readonly memberships: readonly MeMembership[];
  readonly currentOrgId: string | null;
  readonly currentOrg: MeMembership | null;
  readonly orgType: OrgType | null;
  readonly userRole: MemberRole | null;
  readonly permissions: readonly Permission[];
  readonly features: readonly Feature[];
  readonly plan: PlanSummary | null;
  readonly needsBootstrap: boolean;

  bootstrap: (input: MeBootstrapInput) => Promise<Me>;
  selectOrg: (orgId: string) => Promise<void> | void;
  refreshMe: () => Promise<Me | null>;

  // ─── Action nghiệp vụ — chữ ký giữ nguyên ─────────────────────────────────
  addTransaction: (input: NewTransaction) => Transaction;
  addSupplier: (input: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (supplierId: string) => void;
  addProduct: (input: NewProduct) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  upsertDraft: (draft: DraftInput) => DraftReceipt;
  deleteDraft: (draftId: string) => void;
  completeDraft: (draftId: string) => Transaction | null;
  recordPayment: (txId: string, amount: number) => Payment | null;
  removePayment: (txId: string, paymentId: string) => void;
  updateTransactionAttachments: (txId: string, attachmentIds: string[]) => void;
  deleteTransaction: (txId: string) => void;
  addNote: (body: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  reset: () => void;
  addBuyer: (input: Omit<Buyer, 'id'>) => Buyer;
  updateBuyer: (id: string, patch: Partial<Buyer>) => void;
  deleteBuyer: (buyerId: string) => void;
  addPricingRule: (input: Omit<PricingRule, 'id'>) => PricingRule;
  updatePricingRule: (id: string, patch: Partial<PricingRule>) => void;
  deletePricingRule: (ruleId: string) => void;
  importData: (payload: unknown) => void;

  importSuppliers: (rows: readonly SupplierImport[]) => number;
  importReceipts: (rows: readonly ReceiptImport[]) => number;

  // ─── Tài khoản ────────────────────────────────────────────────────────────
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Đẩy hàng đợi và kéo thay đổi ngay, không đợi hẹn giờ. */
  syncNow: () => void;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore phải nằm trong <StoreProvider>');
  return store;
}
