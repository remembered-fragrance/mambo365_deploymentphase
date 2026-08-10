/**
 * Cửa DUY NHẤT để màn hình chạm tầng dữ liệu.
 *
 * 🔴 Chữ ký 22 action của bản demo KHÔNG ĐỔI. Giai đoạn E thêm ba action và
 * chỉ ba: updateSupplier · deleteSupplier (KH Frontend §7.7) và removePayment
 * (E §3.1 bắt buộc hoàn tác được). Mỗi lần thêm phải viết được lý do vào đây.
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
  Payment,
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
import type { ProfilePatch, SignUpInput } from './auth';

export interface StoreValue {
  readonly data: AppData;
  /** Trạng thái đồng bộ để giao diện vẽ thanh "đang chờ gửi", "lỗi mạng"… */
  readonly status: SyncStatus;
  readonly user: UserProfile | null;

  // ─── Action nghiệp vụ — chữ ký giữ nguyên ─────────────────────────────────
  addTransaction: (input: NewTransaction) => Transaction;
  addSupplier: (input: Omit<Supplier, 'id'>) => Supplier;
  /**
   * Hai action thêm ở giai đoạn E — chỗ DUY NHẤT kế hoạch cho phép mở rộng
   * danh sách này (KH Frontend §7.7): phía người mua đã sửa/xoá được từ lâu,
   * phía người bán thì chưa, và màn Đối tác dùng chung một component cho cả hai.
   */
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (supplierId: string) => void;
  addProduct: (input: NewProduct) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  upsertDraft: (draft: DraftInput) => DraftReceipt;
  deleteDraft: (draftId: string) => void;
  completeDraft: (draftId: string) => Transaction | null;
  recordPayment: (txId: string, amount: number) => Payment | null;
  /**
   * Bỏ một lần trả tiền. Có mặt vì màn Công nợ bắt buộc phải hoàn tác được
   * trong 8 giây (E §3.1) — ghi tiền là thao tác lặp cả ngày, bấm nhầm là
   * chuyện chắc chắn xảy ra.
   */
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
  /** Nhập lại sổ từ file đã lưu. Giao diện KHÔNG được tự đụng vào lưu trữ. */
  importData: (payload: unknown) => void;

  // ─── Tài khoản ────────────────────────────────────────────────────────────
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Sửa hồ sơ vựa (tên, tên vựa, email lấy lại mật khẩu). */
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  /** Đẩy hàng đợi và kéo thay đổi ngay, không đợi hẹn giờ. */
  syncNow: () => void;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore phải nằm trong <StoreProvider>');
  return store;
}
