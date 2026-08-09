/**
 * Kéo thay đổi từ máy chủ về và hoà vào sổ cục bộ.
 *
 * Kéo theo `updated_at > mốc lần trước`, không tải lại toàn bộ — nếu không,
 * app chậm dần theo thời gian và tốn băng thông của người dùng dùng 3G.
 *
 * Quy tắc hoà (README C §3.4):
 *   trường vô hướng  → ghi sau thắng theo updated_at
 *   payments         → KHÔNG BAO GIỜ ghi đè, hợp nhất theo id
 *   xoá              → xoá mềm thắng, bản cập nhật đến sau không hồi sinh
 *   bản ghi còn nằm trong hàng đợi → giữ bản cục bộ, nó sẽ được đẩy lên sau
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Payment, Transaction } from '@/core/types';
import {
  buyerFromRow,
  draftFromRow,
  noteFromRow,
  paymentFromRow,
  pricingRuleFromRow,
  productFromRow,
  supplierFromRow,
  transactionFromRow,
} from './mappers';
import type {
  DraftRow,
  NoteRow,
  PartyRow,
  PaymentRow,
  PricingRuleRow,
  ProductRow,
  TransactionRow,
} from './rows';

const EPOCH = '1970-01-01T00:00:00.000Z';

interface RemoteChanges {
  readonly suppliers: PartyRow[];
  readonly buyers: PartyRow[];
  readonly products: ProductRow[];
  readonly transactions: TransactionRow[];
  readonly payments: PaymentRow[];
  readonly drafts: DraftRow[];
  readonly pricingRules: PricingRuleRow[];
  readonly notes: NoteRow[];
}

const fetchSince = async <T>(
  supabase: SupabaseClient,
  table: string,
  column: string,
  since: string,
  select = '*',
): Promise<T[]> => {
  const { data, error } = await supabase.from(table).select(select).gt(column, since);
  if (error) throw new Error(`Không đọc được ${table}: ${error.message}`);
  return (data ?? []) as unknown as T[];
};

export const fetchChanges = async (
  supabase: SupabaseClient,
  since: string | null,
): Promise<RemoteChanges> => {
  const mark = since ?? EPOCH;
  const [suppliers, buyers, products, transactions, payments, drafts, pricingRules, notes] =
    await Promise.all([
      fetchSince<PartyRow>(supabase, 'suppliers', 'updated_at', mark),
      fetchSince<PartyRow>(supabase, 'buyers', 'updated_at', mark),
      fetchSince<ProductRow>(supabase, 'products', 'updated_at', mark),
      fetchSince<TransactionRow>(supabase, 'transactions', 'updated_at', mark, '*, payments(*)'),
      fetchSince<PaymentRow>(supabase, 'payments', 'created_at', mark),
      fetchSince<DraftRow>(supabase, 'drafts', 'updated_at', mark),
      fetchSince<PricingRuleRow>(supabase, 'pricing_rules', 'updated_at', mark),
      fetchSince<NoteRow>(supabase, 'notes', 'updated_at', mark),
    ]);
  return { suppliers, buyers, products, transactions, payments, drafts, pricingRules, notes };
};

// ─── Hoà từng loại ───────────────────────────────────────────────────────────

interface Identified {
  readonly id: string;
}

/**
 * Hoà danh sách: hàng máy chủ thay hàng cục bộ cùng id, hàng bị xoá mềm thì
 * biến mất. Bản ghi đang nằm trong hàng đợi được GIỮ NGUYÊN bản cục bộ.
 */
const mergeList = <TLocal extends Identified, TRow extends { id: string; deleted_at: string | null }>(
  local: readonly TLocal[],
  rows: readonly TRow[],
  fromRow: (row: TRow) => TLocal,
  pendingIds: ReadonlySet<string>,
): TLocal[] => {
  const merged = new Map(local.map((item) => [item.id, item]));

  for (const row of rows) {
    if (pendingIds.has(row.id)) continue;
    if (row.deleted_at !== null) merged.delete(row.id);
    else merged.set(row.id, fromRow(row));
  }

  return [...merged.values()];
};

const sortByDate = (payments: Payment[]): Payment[] =>
  payments.sort((a, b) => a.date.localeCompare(b.date));

/**
 * Áp các hàng payment vừa kéo về lên danh sách hiện có.
 * Hàng có `deleted_at` là lần trả bị huỷ ⇒ bỏ đi; còn lại là thêm/cập nhật.
 */
const applyPaymentRows = (
  existing: readonly Payment[],
  rows: readonly PaymentRow[],
): Payment[] => {
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const row of rows) {
    if (row.deleted_at !== null) byId.delete(row.id);
    else byId.set(row.id, paymentFromRow(row));
  }
  return sortByDate([...byId.values()]);
};

/**
 * 🔴 HỢP NHẤT, không thay thế.
 * Bản phiếu từ máy chủ chỉ mang những lần trả mà máy chủ biết. Nếu lấy thẳng
 * danh sách đó thì khoản vừa ghi lúc mất mạng biến mất — đúng kịch bản mất
 * tiền mà việc tách bảng `payments` sinh ra để tránh.
 */
const unionPayments = (
  local: readonly Payment[],
  fromServer: readonly Payment[],
  serverRows: readonly PaymentRow[],
): Payment[] => {
  const byId = new Map(local.map((p) => [p.id, p]));
  for (const p of fromServer) byId.set(p.id, p);
  // Máy chủ nói lần trả nào đã huỷ thì bỏ, kể cả khi bản cục bộ còn giữ.
  for (const row of serverRows) {
    if (row.deleted_at !== null) byId.delete(row.id);
  }
  return sortByDate([...byId.values()]);
};

const withPayments = (tx: Transaction, payments: readonly Payment[]): Transaction => ({
  ...tx,
  payments,
  amountPaid: payments.reduce((s, p) => s + p.amount, 0),
});

const mergeTransactions = (
  local: readonly Transaction[],
  rows: readonly TransactionRow[],
  loosePayments: readonly PaymentRow[],
  pendingIds: ReadonlySet<string>,
): Transaction[] => {
  const byId = new Map(local.map((t) => [t.id, t]));

  for (const row of rows) {
    if (pendingIds.has(row.id)) continue;
    if (row.deleted_at !== null) {
      byId.delete(row.id);
      continue;
    }

    const incoming = transactionFromRow(row);
    const existing = byId.get(row.id);
    byId.set(
      row.id,
      existing
        ? withPayments(
            incoming,
            unionPayments(existing.payments, incoming.payments, row.payments ?? []),
          )
        : incoming,
    );
  }

  // Ghi trả nợ KHÔNG làm đổi updated_at của phiếu, nên lần trả từ máy khác đến
  // theo đường riêng — chỉ kéo phiếu là mất khoản đó.
  const looseByTx = new Map<string, PaymentRow[]>();
  for (const row of loosePayments) {
    const list = looseByTx.get(row.transaction_id) ?? [];
    list.push(row);
    looseByTx.set(row.transaction_id, list);
  }

  for (const [txId, rowsOfTx] of looseByTx) {
    const tx = byId.get(txId);
    if (!tx) continue;
    byId.set(txId, withPayments(tx, applyPaymentRows(tx.payments, rowsOfTx)));
  }

  return [...byId.values()];
};

export const mergeChanges = (
  local: AppData,
  changes: RemoteChanges,
  pendingIds: ReadonlySet<string>,
): AppData => {
  const transactions = mergeTransactions(
    local.transactions,
    changes.transactions,
    changes.payments,
    pendingIds,
  );

  return {
    ...local,
    suppliers: mergeList(local.suppliers, changes.suppliers, supplierFromRow, pendingIds),
    buyers: mergeList(local.buyers, changes.buyers, buyerFromRow, pendingIds),
    products: mergeList(local.products, changes.products, productFromRow, pendingIds),
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
    drafts: mergeList(local.drafts, changes.drafts, draftFromRow, pendingIds),
    pricingRules: mergeList(
      local.pricingRules ?? [],
      changes.pricingRules,
      pricingRuleFromRow,
      pendingIds,
    ),
    notes: mergeList(local.notes, changes.notes, noteFromRow, pendingIds),
  };
};
