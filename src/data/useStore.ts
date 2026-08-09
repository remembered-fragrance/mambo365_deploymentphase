/**
 * Cửa DUY NHẤT để màn hình chạm tầng dữ liệu.
 *
 * 🔴 Chữ ký 22 action dưới đây KHÔNG ĐỔI so với bản demo. Nhờ vậy các giai
 * đoạn sau chỉ việc dùng, không phải biết dữ liệu đến từ máy hay từ mạng.
 *
 * 🔴 Không action nào trả Promise. Ghi vào máy là đồng bộ và trả kết quả ngay;
 * việc đẩy lên máy chủ chạy nền. Đổi sang async là buộc mọi chỗ gọi phải sửa.
 */

import { createContext, useContext } from 'react';
import type {
  AppData,
  AppSettings,
  Buyer,
  DraftReceipt,
  Note,
  PricingRule,
  Product,
  Supplier,
  SyncStatus,
  Transaction,
  UserProfile,
} from '@/core/types';
import type { DraftInput } from '@/core/draftActions';
import type { NewProduct } from '@/core/productActions';
import type { NewTransaction } from '@/core/receiptActions';
import type { SignUpInput } from './auth';

export interface StoreValue {
  readonly data: AppData;
  /** Trạng thái đồng bộ để giao diện vẽ thanh "đang chờ gửi", "lỗi mạng"… */
  readonly status: SyncStatus;
  readonly user: UserProfile | null;

  // ─── 22 action nghiệp vụ — chữ ký giữ nguyên ──────────────────────────────
  addTransaction: (input: NewTransaction) => Transaction;
  addSupplier: (input: Omit<Supplier, 'id'>) => Supplier;
  addProduct: (input: NewProduct) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  upsertDraft: (draft: DraftInput) => DraftReceipt;
  deleteDraft: (draftId: string) => void;
  completeDraft: (draftId: string) => Transaction | null;
  recordPayment: (txId: string, amount: number) => void;
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
  /** Nhập lại sổ từ file backup. Giao diện KHÔNG được tự đụng vào lưu trữ. */
  importData: (payload: unknown) => void;

  // ─── Tài khoản ────────────────────────────────────────────────────────────
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Đẩy hàng đợi và kéo thay đổi ngay, không đợi hẹn giờ. */
  syncNow: () => void;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore phải nằm trong <StoreProvider>');
  return store;
}
