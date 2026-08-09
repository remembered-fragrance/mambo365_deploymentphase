/**
 * Hình dạng hàng trong database — bản đối chiếu của `supabase/migrations/`.
 *
 * Khi đã có project Supabase, chạy `npm run db:types` để sinh
 * `database.types.ts` rồi đối chiếu file này với nó. Giữ file viết tay ở đây
 * để mapper có kiểu thật ngay từ bây giờ, thay vì `any`.
 *
 * Ba lưu ý:
 *  - `transactions` KHÔNG có cột `amount_paid`. Luôn tính `sum(payments)`.
 *  - `lines` / `credit_terms` / `adjustments` là JSONB giữ nguyên hình dạng của
 *    `core/types.ts` (camelCase bên trong) — chúng được đóng băng theo phiếu
 *    và không bao giờ truy vấn lẻ từng trường.
 *  - `counterparty_id` NULL nghĩa là Khách lẻ, không có hồ sơ đối tác.
 */

import type { CreditTerm, PriceAdjustment, TransactionLine } from '@/core/types';

export interface BaseRow {
  readonly id: string;
  readonly user_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

export interface PartyRow extends BaseRow {
  readonly name: string;
  readonly phone: string | null;
  readonly location: string | null;
  readonly note: string | null;
}

export interface ProductRow extends BaseRow {
  readonly name: string;
  readonly unit: string;
  readonly formula_type: string;
  readonly is_suggested: boolean;
  readonly is_active: boolean;
  readonly crop: string | null;
  readonly last_price_per_unit: number | null;
  readonly group: string | null;
  readonly quality_grades: string[] | null;
  readonly track_inventory: boolean | null;
}

export interface TransactionRow extends BaseRow {
  readonly date: string;
  readonly kind: string;
  readonly counterparty_id: string | null;
  readonly supplier_id: string | null;
  readonly supplier_name: string;
  readonly lines: TransactionLine[];
  readonly credit_terms: CreditTerm[] | null;
  readonly adjustments: PriceAdjustment[] | null;
  readonly attachment_ids: string[] | null;
  readonly note: string | null;
  /** Có khi đọc bằng `select *, payments(*)`. */
  readonly payments?: PaymentRow[];
}

export interface PaymentRow {
  readonly id: string;
  readonly transaction_id: string;
  readonly user_id: string;
  readonly date: string;
  readonly amount: number;
  readonly note: string | null;
  readonly created_at: string;
  readonly deleted_at: string | null;
}

export interface DraftRow extends BaseRow {
  readonly status: string;
  readonly kind: string | null;
  readonly counterparty_id: string | null;
  readonly supplier_id: string | null;
  readonly supplier_name: string;
  readonly lines: TransactionLine[];
  readonly amount_paid: number;
  readonly note: string | null;
  readonly attachment_ids: string[] | null;
}

export interface PricingRuleRow extends BaseRow {
  readonly name: string;
  readonly kind: string;
  readonly product_id: string | null;
  readonly fixed_amount: number | null;
  readonly percent_of_total: number | null;
  readonly min_weight_kg: number | null;
  readonly applies_on_pickup: boolean | null;
  readonly active: boolean;
}

export interface NoteRow extends BaseRow {
  readonly body: string;
  readonly pinned: boolean;
  readonly done: boolean;
}

export interface ProfileRow {
  readonly id: string;
  readonly name: string;
  readonly username: string | null;
  readonly phone: string | null;
  readonly recovery_email: string | null;
  readonly business_name: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

/** Tên bảng dùng trong hàng đợi và khi kéo dữ liệu về. */
export const TABLES = [
  'suppliers',
  'buyers',
  'products',
  'transactions',
  'payments',
  'drafts',
  'pricing_rules',
  'notes',
] as const;

export type TableName = (typeof TABLES)[number];
