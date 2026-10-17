/**
 * Cửa DUY NHẤT để màn hình chạm tầng dữ liệu.
 *
 * 🔴 Chữ ký 22 action của bản demo KHÔNG ĐỔI.
 * Thêm các trường tổ chức, vai trò và bootstrap theo hợp đồng @mambo/contracts.
 */

import { createContext, useContext } from 'react';
import type { DraftInput } from '@mambo/core/draftActions';
import type { NewProduct } from '@mambo/core/productActions';
import type { NewTransaction } from '@mambo/core/receiptActions';
import type { ReceiptImport, SupplierImport } from '@mambo/core/sheetImport';
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
} from '@mambo/core/types';
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
import { L } from '@/i18n/labels';
import type { ProfilePatch, SignUpInput } from './auth';

/** Đăng xuất bị chặn vì còn thao tác chưa lên máy chủ. Màn hình hỏi lại rồi gọi `signOut({ discardUnsent: true })`. */
export class UnsentOpsError extends Error {
  readonly count: number;

  constructor(count: number) {
    super(`${L.signOutUnsent} (${count})`);
    this.name = 'UnsentOpsError';
    this.count = count;
  }
}

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
  /** Khoá của sổ đang mở (id tổ chức, hoặc id tài khoản của máy khi không có máy chủ). */
  readonly bookKey: string | null;
  /**
   * Sổ đang đồng bộ với máy chủ (có máy chủ, có quyền, gói còn hạn). Khi đó sổ là của máy chủ:
   * không được thay cả sổ trên máy bằng file.
   */
  readonly syncsWithServer: boolean;

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
  /**
   * Link "đặt lại mật khẩu" trong thư: đổi `token_hash` lấy phiên rồi vào app như đăng nhập. Sau đó
   * `changePassword` đặt mật khẩu mới. Link sai / hết hạn / đã dùng → lỗi `L.resetLinkInvalid`.
   */
  openRecoverySession: (tokenHash: string) => Promise<void>;
  /**
   * Còn thao tác chưa gửi thì ném `UnsentOpsError`, trừ khi `discardUnsent` — người dùng đã đồng ý
   * bỏ chúng (gói hết hạn thì hàng đợi không bao giờ rỗng, không cho bỏ là khoá họ trong app).
   */
  signOut: (options?: { readonly discardUnsent?: boolean }) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Đẩy hàng đợi và kéo thay đổi ngay, không đợi hẹn giờ. */
  syncNow: () => void;
  /** Có thao tác bị máy chủ từ chối đang chặn hàng đợi. */
  readonly stuck: boolean;
  /** Bỏ cờ từ chối, gửi lại ngay. */
  retryStuck: () => void;
  /** Bỏ thao tác bị từ chối (máy chủ sẽ không có nó) để các thao tác sau đi tiếp. */
  dropStuck: () => void;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore phải nằm trong <StoreProvider>');
  return store;
}
