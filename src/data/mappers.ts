/**
 * Chỗ DUY NHẤT hai thế giới gặp nhau: camelCase của app ↔ snake_case của database.
 *
 * Luật: không `as any`, không trải `...row`. Viết ra từng trường — trường bị
 * quên ở đây biểu hiện thành "mất dữ liệu" chứ không thành lỗi biên dịch.
 * Kiểu sinh từ database không được rò rỉ ra ngoài `src/data/`.
 */

import { formulaFrom, GUEST_BUYER_ID, GUEST_SUPPLIER_ID } from '@/core/normalizeTransaction';
import type {
  Buyer,
  DraftReceipt,
  Note,
  Payment,
  PricingRule,
  Product,
  Supplier,
  Transaction,
} from '@/core/types';
import type {
  DraftRow,
  NoteRow,
  PartyRow,
  PaymentRow,
  PricingRuleRow,
  ProductRow,
  TransactionRow,
} from './rows';

/** Mã khách lẻ là quy ước của `core/`, không phải hồ sơ thật ⇒ không xuống database. */
const partyIdToRow = (id: string): string | null =>
  id === GUEST_SUPPLIER_ID || id === GUEST_BUYER_ID ? null : id;

const partyIdFromRow = (id: string | null, kind: string): string =>
  id ?? (kind === 'sale' ? GUEST_BUYER_ID : GUEST_SUPPLIER_ID);

const nullable = <T>(value: T | undefined): T | null => value ?? null;
const optional = <T>(value: T | null): T | undefined => value ?? undefined;

// ─── Đối tác ─────────────────────────────────────────────────────────────────

export const partyToRow = (party: Supplier | Buyer, userId: string) => ({
  id: party.id,
  user_id: userId,
  name: party.name,
  phone: nullable(party.phone),
  location: nullable(party.location),
  note: nullable(party.note),
});

export const supplierFromRow = (row: PartyRow): Supplier => ({
  id: row.id,
  name: row.name,
  phone: optional(row.phone),
  location: optional(row.location),
  note: optional(row.note),
});

export const buyerFromRow = (row: PartyRow): Buyer => supplierFromRow(row);

// ─── Mặt hàng ────────────────────────────────────────────────────────────────

export const productToRow = (product: Product, userId: string) => ({
  id: product.id,
  user_id: userId,
  name: product.name,
  unit: product.unit,
  formula_type: product.formulaType,
  is_suggested: product.isSuggested,
  is_active: product.isActive,
  crop: nullable(product.crop),
  last_price_per_unit: nullable(product.lastPricePerUnit),
  group: nullable(product.group),
  quality_grades: product.qualityGrades ? [...product.qualityGrades] : null,
  track_inventory: nullable(product.trackInventory),
});

export const productFromRow = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  formulaType: formulaFrom(row.formula_type),
  isSuggested: row.is_suggested,
  isActive: row.is_active,
  crop: optional(row.crop) as Product['crop'],
  lastPricePerUnit: optional(row.last_price_per_unit),
  group: optional(row.group),
  qualityGrades: optional(row.quality_grades),
  trackInventory: optional(row.track_inventory),
});

// ─── Lần trả tiền ────────────────────────────────────────────────────────────

export const paymentToRow = (payment: Payment, transactionId: string, userId: string) => ({
  id: payment.id,
  transaction_id: transactionId,
  user_id: userId,
  date: payment.date,
  amount: payment.amount,
  note: nullable(payment.note),
});

export const paymentFromRow = (row: PaymentRow): Payment => ({
  id: row.id,
  date: row.date,
  amount: row.amount,
  note: optional(row.note),
});

// ─── Phiếu ───────────────────────────────────────────────────────────────────

export const transactionToRow = (tx: Transaction, userId: string) => ({
  id: tx.id,
  user_id: userId,
  date: tx.date,
  kind: tx.kind,
  counterparty_id: partyIdToRow(tx.counterpartyId),
  supplier_id: tx.supplierId,
  supplier_name: tx.supplierName,
  lines: tx.lines,
  credit_terms: nullable(tx.creditTerms),
  adjustments: nullable(tx.adjustments),
  attachment_ids: tx.attachmentIds ? [...tx.attachmentIds] : null,
  note: nullable(tx.note),
});

/**
 * `amountPaid` LUÔN tính lại từ bảng payments — không có cột nào để đọc.
 * Đây là chỗ bất biến `amountPaid = sum(payments)` được database bảo đảm
 * thay vì chỉ là quy ước trong code.
 */
export const transactionFromRow = (row: TransactionRow): Transaction => {
  const payments = (row.payments ?? [])
    .filter((p) => p.deleted_at === null)
    .map(paymentFromRow)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: row.id,
    date: row.date,
    kind: row.kind === 'sale' ? 'sale' : 'purchase',
    counterpartyId: partyIdFromRow(row.counterparty_id, row.kind),
    supplierId: row.supplier_id ?? partyIdFromRow(row.counterparty_id, row.kind),
    supplierName: row.supplier_name,
    lines: row.lines,
    creditTerms: optional(row.credit_terms),
    adjustments: optional(row.adjustments),
    attachmentIds: optional(row.attachment_ids),
    note: optional(row.note),
    payments,
    amountPaid: payments.reduce((s, p) => s + p.amount, 0),
    syncState: 'synced',
  };
};

// ─── Nháp ────────────────────────────────────────────────────────────────────

export const draftToRow = (draft: DraftReceipt, userId: string) => ({
  id: draft.id,
  user_id: userId,
  status: draft.status,
  kind: nullable(draft.kind),
  counterparty_id: draft.counterpartyId ? partyIdToRow(draft.counterpartyId) : null,
  supplier_id: nullable(draft.supplierId),
  supplier_name: draft.supplierName,
  lines: draft.lines,
  amount_paid: draft.amountPaid,
  note: nullable(draft.note),
  attachment_ids: draft.attachmentIds ? [...draft.attachmentIds] : null,
  created_at: draft.createdAt,
  updated_at: draft.updatedAt,
});

export const draftFromRow = (row: DraftRow): DraftReceipt => ({
  id: row.id,
  status: row.status === 'waiting' ? 'waiting' : 'draft',
  kind: row.kind === 'sale' ? 'sale' : row.kind === 'purchase' ? 'purchase' : undefined,
  counterpartyId: optional(row.counterparty_id),
  supplierId: optional(row.supplier_id),
  supplierName: row.supplier_name,
  lines: row.lines,
  amountPaid: row.amount_paid,
  note: optional(row.note),
  attachmentIds: optional(row.attachment_ids),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ─── Quy tắc giá ─────────────────────────────────────────────────────────────

export const pricingRuleToRow = (rule: PricingRule, userId: string) => ({
  id: rule.id,
  user_id: userId,
  name: rule.name,
  kind: rule.kind,
  product_id: nullable(rule.productId),
  fixed_amount: nullable(rule.fixedAmount),
  percent_of_total: nullable(rule.percentOfTotal),
  min_weight_kg: nullable(rule.minWeightKg),
  applies_on_pickup: rule.appliesOnPickup ?? null,
  active: rule.active,
});

export const pricingRuleFromRow = (row: PricingRuleRow): PricingRule => ({
  id: row.id,
  name: row.name,
  kind: row.kind === 'logistics' || row.kind === 'volumeDiscount' ? row.kind : 'manual',
  productId: optional(row.product_id),
  fixedAmount: optional(row.fixed_amount),
  percentOfTotal: optional(row.percent_of_total),
  minWeightKg: optional(row.min_weight_kg),
  appliesOnPickup: row.applies_on_pickup,
  active: row.active,
});

// ─── Ghi chú ─────────────────────────────────────────────────────────────────

export const noteToRow = (note: Note, userId: string) => ({
  id: note.id,
  user_id: userId,
  body: note.body,
  pinned: note.pinned,
  done: note.done,
  created_at: note.createdAt,
  updated_at: note.updatedAt,
});

export const noteFromRow = (row: NoteRow): Note => ({
  id: row.id,
  body: row.body,
  pinned: row.pinned,
  done: row.done,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
