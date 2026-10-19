/**
 * Cửa DUY NHẤT để màn hình chạm tầng dữ liệu.
 *
 * 🔴 Chữ ký 22 action của bản demo KHÔNG ĐỔI.
 * Thêm các trường tổ chức, vai trò và bootstrap theo hợp đồng @mambo/contracts.
 */

import { createContext, useContext } from 'react';
import type { DraftInput } from '@mambo/core/draftActions';
import type { NewProduct } from '@mambo/core/productActions';
import type { PartyMatch } from '@mambo/core/partyActions';
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
import type { PhotoAlert } from './attachments';
import type { KnownBook } from './knownBooks';
import type { DroppedItem, SyncNotice } from './sync';

/**
 * B7: tab khác vừa mở bản app mới, tab này không ghi xuống máy được nữa. `saved`: phần chưa ghi đã cứu vào
 * localStorage, tải lại là vào sổ. `unsaved`: cứu cũng hỏng — phiếu chỉ còn trên màn hình. `idle`: lỗi gặp lúc
 * đồng bộ / ghi phần kéo về, không có thay đổi nào của người dùng dở dang.
 */
export type ReloadRequired = 'idle' | 'saved' | 'unsaved' | null;

/** B8: tổ chức đã gỡ người này. `unsent` > 0: sổ còn giữ trên máy chờ người dùng xuất file rồi dọn. */
export interface LeftOrg extends KnownBook {
  readonly unsent: number;
}

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
  /** Sổ chỉ nằm trên máy (chưa vào tổ chức) — mới được thay bằng file. Sổ tổ chức thì không, kể cả hết gói (B1). */
  readonly importsFromFile: boolean;

  bootstrap: (input: MeBootstrapInput) => Promise<Me>;
  selectOrg: (orgId: string) => Promise<void> | void;
  refreshMe: () => Promise<Me | null>;

  // ─── Action nghiệp vụ — chữ ký giữ nguyên ─────────────────────────────────
  /**
   * `match` (B3): tên gõ trùng hồ sơ đã có thì mặc định dùng lại người cũ — `asNew` ép tạo người mới,
   * `keepApart` không gộp vào hồ sơ đang kết nối. Xem `PartyMatch` trong `@mambo/core/partyActions`.
   */
  addTransaction: (input: NewTransaction, match?: PartyMatch) => Transaction;
  addSupplier: (input: Omit<Supplier, 'id'>, match?: PartyMatch) => Supplier;
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
  addBuyer: (input: Omit<Buyer, 'id'>, match?: PartyMatch) => Buyer;
  updateBuyer: (id: string, patch: Partial<Buyer>) => void;
  deleteBuyer: (buyerId: string) => void;
  addPricingRule: (input: Omit<PricingRule, 'id'>) => PricingRule;
  updatePricingRule: (id: string, patch: Partial<PricingRule>) => void;
  deletePricingRule: (ruleId: string) => void;
  importData: (payload: unknown) => void;

  importSuppliers: (rows: readonly SupplierImport[], match?: Pick<PartyMatch, 'keepApart'>) => number;
  importReceipts: (rows: readonly ReceiptImport[], match?: Pick<PartyMatch, 'keepApart'>) => number;

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
  /**
   * Thứ đã tự bỏ vì chủ đổi chi nhánh của người này, từng phiếu / lần trả (B10) — giữ tới khi người dùng bấm
   * "Đã ghi lại" (`dismissBranchDropped`), để còn nhập lại.
   */
  readonly branchDropped: readonly DroppedItem[];
  dismissBranchDropped: () => void;
  /** Ảnh chứng từ bị máy chủ từ chối hẳn, hay thử mãi không lên (cộng dồn trong phiên) — B6. */
  readonly photoAlerts: readonly PhotoAlert[];
  /** Phải tải lại app mới ghi xuống máy được (B7) — giao diện chặn cả màn hình. */
  readonly reloadRequired: ReloadRequired;
  /** Tổ chức đã gỡ người này (B8). */
  readonly leftOrgs: readonly LeftOrg[];
  /** Sổ trên máy của tổ chức đã gỡ — để xuất file trước khi dọn. */
  readLeftOrgBook: (orgId: string) => Promise<AppData | null>;
  /** Dọn sổ, op chưa gửi và ảnh của tổ chức đã gỡ khỏi máy. */
  wipeLeftOrg: (orgId: string) => Promise<void>;
  /** Ẩn thông báo tổ chức đã gỡ (sổ đã dọn sẵn). */
  dismissLeftOrg: (orgId: string) => void;
  /** Thay đổi ghi bằng bản app trước, chưa rõ người ghi, đang cách ly (B8) — không tự gửi. */
  readonly unowned: readonly DroppedItem[];
  /** Người dùng xác nhận các thay đổi đó do chính mình ghi: gửi bằng tài khoản này. */
  claimUnowned: () => Promise<void>;
  /**
   * Op máy chủ đã nhận kèm cảnh báo (cộng dồn trong phiên): `ORDER_NOT_OPEN` — phiếu / nháp vẫn lưu nhưng
   * bị gỡ khỏi đơn (đơn đã huỷ, không còn); `RECORD_DELETED` — bản ghi đã bị xoá ở máy khác.
   */
  readonly syncWarnings: readonly SyncNotice[];
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
