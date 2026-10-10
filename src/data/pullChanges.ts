/**
 * Kéo thay đổi từ máy chủ về và hoà vào sổ cục bộ.
 *
 * Quy tắc hoà (BE FRONTEND §7.6 & năm quy tắc chống mất tiền):
 *   1. Số đã trả = tổng các payment; huỷ lần trả = softDelete
 *   2. Gửi trùng id = duplicate (id sinh lúc tạo)
 *   3. Xoá mềm thắng: bản ghi có deletedAt khác null thì xoá khỏi sổ cục bộ
 *   4. Xử lý theo seq tăng dần
 *   5. Hợp nhất qua nhiều trang, không bỏ payment chưa thấy phiếu cha
 */

import type { AppData, Payment, Transaction } from '@/core/types';
import type {
  DraftRecord,
  NoteRecord,
  PartyRecord,
  PaymentRecord,
  PricingRuleRecord,
  ProductRecord,
  SyncChanges,
  SyncPullResult,
  TransactionRecord,
} from '@mambo/contracts';
import { apiForOrg } from './client';
import {
  buyerFromRow,
  draftFromRecord,
  draftFromRow,
  noteFromRecord,
  noteFromRow,
  partyFromRecord,
  paymentFromRecord,
  paymentFromRow,
  pricingRuleFromRecord,
  pricingRuleFromRow,
  productFromRecord,
  productFromRow,
  supplierFromRow,
  transactionFromRecord,
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

export interface RemoteChanges {
  readonly suppliers: (PartyRow | PartyRecord)[];
  readonly buyers: (PartyRow | PartyRecord)[];
  readonly products: (ProductRow | ProductRecord)[];
  readonly transactions: (TransactionRow | TransactionRecord)[];
  readonly payments: (PaymentRow | PaymentRecord)[];
  readonly drafts: (DraftRow | DraftRecord)[];
  readonly pricingRules: (PricingRuleRow | PricingRuleRecord)[];
  readonly notes: (NoteRow | NoteRecord)[];
}

/**
 * Kéo một trang thay đổi qua @mambo/sdk /v1/sync/pull
 */
export const pullChanges = async (
  orgId: string,
  cursor?: string,
  limit?: number,
): Promise<SyncPullResult> => {
  return apiForOrg(orgId).sync.pull({ cursor, limit });
};

// ─── Hoà từng loại ───────────────────────────────────────────────────────────

interface Identified {
  readonly id: string;
}

const getDeletedAt = (row: unknown): string | null => {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  return (r.deletedAt as string | null) ?? (r.deleted_at as string | null) ?? null;
};

/**
 * Hoà danh sách: hàng máy chủ thay hàng cục bộ cùng id, hàng bị xoá mềm thì
 * biến mất. Bản ghi đang nằm trong hàng đợi được GIỮ NGUYÊN bản cục bộ.
 */
const mergeList = <TLocal extends Identified, TRow extends { id: string }>(
  local: readonly TLocal[],
  rows: readonly TRow[],
  fromRow: (row: TRow) => TLocal,
  pendingIds: ReadonlySet<string>,
): TLocal[] => {
  const merged = new Map(local.map((item) => [item.id, item]));

  for (const row of rows) {
    if (pendingIds.has(row.id)) continue;
    if (getDeletedAt(row) !== null) merged.delete(row.id);
    else merged.set(row.id, fromRow(row));
  }

  return [...merged.values()];
};

const mapSupplier = (row: PartyRow | PartyRecord) =>
  'user_id' in row ? supplierFromRow(row as PartyRow) : partyFromRecord(row as PartyRecord);

const mapBuyer = (row: PartyRow | PartyRecord) =>
  'user_id' in row ? buyerFromRow(row as PartyRow) : partyFromRecord(row as PartyRecord);

const mapProduct = (row: ProductRow | ProductRecord) =>
  'user_id' in row ? productFromRow(row as ProductRow) : productFromRecord(row as ProductRecord);

const mapPricingRule = (row: PricingRuleRow | PricingRuleRecord) =>
  'user_id' in row ? pricingRuleFromRow(row as PricingRuleRow) : pricingRuleFromRecord(row as PricingRuleRecord);

const mapNote = (row: NoteRow | NoteRecord) =>
  'user_id' in row ? noteFromRow(row as NoteRow) : noteFromRecord(row as NoteRecord);

const mapDraft = (row: DraftRow | DraftRecord) =>
  'user_id' in row ? draftFromRow(row as DraftRow) : draftFromRecord(row as DraftRecord);

const mapPayment = (row: PaymentRow | PaymentRecord): Payment =>
  'user_id' in row ? paymentFromRow(row as PaymentRow) : paymentFromRecord(row as PaymentRecord);

const sortByDate = (payments: Payment[]): Payment[] =>
  payments.sort((a, b) => a.date.localeCompare(b.date));

const applyPaymentRows = (
  existing: readonly Payment[],
  rows: readonly (PaymentRow | PaymentRecord)[],
): Payment[] => {
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const row of rows) {
    if (getDeletedAt(row) !== null) byId.delete(row.id);
    else byId.set(row.id, mapPayment(row));
  }
  return sortByDate([...byId.values()]);
};

/**
 * 🔴 HỢP NHẤT, không thay thế.
 * Bản phiếu từ máy chủ chỉ mang những lần trả mà máy chủ biết. Nếu lấy thẳng
 * danh sách đó thì khoản vừa ghi lúc mất mạng biến mất.
 */
const unionPayments = (
  local: readonly Payment[],
  fromServer: readonly Payment[],
  serverRows: readonly (PaymentRow | PaymentRecord)[],
): Payment[] => {
  const byId = new Map(local.map((p) => [p.id, p]));
  for (const p of fromServer) byId.set(p.id, p);
  // Máy chủ nói lần trả nào đã huỷ thì bỏ, kể cả khi bản cục bộ còn giữ.
  for (const row of serverRows) {
    if (getDeletedAt(row) !== null) byId.delete(row.id);
  }
  return sortByDate([...byId.values()]);
};

const withPayments = (tx: Transaction, payments: readonly Payment[]): Transaction => ({
  ...tx,
  payments,
  amountPaid: payments.reduce((s, p) => s + p.amount, 0),
});

const getTxPaymentId = (row: PaymentRow | PaymentRecord): string => {
  const r = row as Record<string, unknown>;
  return (r.transactionId as string) ?? (r.transaction_id as string) ?? '';
};

const mergeTransactions = (
  local: readonly Transaction[],
  rows: readonly (TransactionRow | TransactionRecord)[],
  loosePayments: readonly (PaymentRow | PaymentRecord)[],
  pendingIds: ReadonlySet<string>,
): Transaction[] => {
  const byId = new Map(local.map((t) => [t.id, t]));

  for (const row of rows) {
    if (pendingIds.has(row.id)) continue;
    if (getDeletedAt(row) !== null) {
      byId.delete(row.id);
      continue;
    }

    const incoming =
      'user_id' in row
        ? transactionFromRow(row as TransactionRow)
        : transactionFromRecord(row as TransactionRecord);
    const existing = byId.get(row.id);
    const embeddedPaymentRows = ('payments' in row && Array.isArray(row.payments) ? row.payments : []) as (PaymentRow | PaymentRecord)[];

    byId.set(
      row.id,
      existing
        ? withPayments(
            incoming,
            unionPayments(existing.payments, incoming.payments, embeddedPaymentRows),
          )
        : incoming,
    );
  }

  // Ghi trả nợ KHÔNG làm đổi updated_at của phiếu, nên lần trả từ máy khác đến
  // theo đường riêng qua bảng payments.
  const looseByTx = new Map<string, (PaymentRow | PaymentRecord)[]>();
  for (const row of loosePayments) {
    const txId = getTxPaymentId(row);
    if (!txId) continue;
    const list = looseByTx.get(txId) ?? [];
    list.push(row);
    looseByTx.set(txId, list);
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
  changes: RemoteChanges | SyncChanges,
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
    suppliers: mergeList(local.suppliers, changes.suppliers, mapSupplier, pendingIds),
    buyers: mergeList(local.buyers, changes.buyers, mapBuyer, pendingIds),
    products: mergeList(local.products, changes.products, mapProduct, pendingIds),
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
    drafts: mergeList(local.drafts, changes.drafts, mapDraft, pendingIds),
    pricingRules: mergeList(
      local.pricingRules ?? [],
      changes.pricingRules,
      mapPricingRule,
      pendingIds,
    ),
    notes: mergeList(local.notes, changes.notes, mapNote, pendingIds),
  };
};
