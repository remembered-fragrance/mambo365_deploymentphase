/**
 * 22 action nghiệp vụ, tách khỏi `store.tsx` để mỗi file làm đúng một việc:
 * file này lo "action nào sinh ra thao tác đồng bộ nào", `store.tsx` lo vòng
 * đời React và phiên đăng nhập.
 *
 * Mỗi action: gọi hàm thuần của `core/` để tính sổ mới, rồi giao cho `commit`
 * lo việc hiện lên màn hình, ghi xuống máy và xếp hàng đợi.
 */

import * as drafts from '@/core/draftActions';
import * as sheets from '@/core/importActions';
import * as notes from '@/core/noteActions';
import * as parties from '@/core/partyActions';
import * as rules from '@/core/pricingRuleActions';
import * as products from '@/core/productActions';
import * as receipts from '@/core/receiptActions';
import { emptyData, normalize } from '@/core/normalize';
import type { AppData } from '@/core/types';
import { derivedOps } from './derivedOps';
import {
  draftToRow,
  noteToRow,
  partyToRow,
  paymentToRow,
  pricingRuleToRow,
  productToRow,
  transactionToRow,
} from './mappers';
import { opInsert, opSoftDelete, opUpdate, type NewOp } from './queue';
import type { StoreValue } from './useStore';

export type BookActions = Pick<
  StoreValue,
  | 'addTransaction'
  | 'addSupplier'
  | 'updateSupplier'
  | 'deleteSupplier'
  | 'addProduct'
  | 'updateProduct'
  | 'upsertDraft'
  | 'deleteDraft'
  | 'completeDraft'
  | 'recordPayment'
  | 'removePayment'
  | 'updateTransactionAttachments'
  | 'deleteTransaction'
  | 'addNote'
  | 'updateNote'
  | 'deleteNote'
  | 'updateSettings'
  | 'reset'
  | 'addBuyer'
  | 'updateBuyer'
  | 'deleteBuyer'
  | 'addPricingRule'
  | 'updatePricingRule'
  | 'deletePricingRule'
  | 'importData'
  | 'importSuppliers'
  | 'importReceipts'
>;

interface Deps {
  /** Sổ MỚI NHẤT — không phải ảnh chụp của lần vẽ hiện tại. Xem `commit`. */
  readonly book: () => AppData;
  readonly commit: (next: AppData, ops: NewOp[]) => void;
  readonly userId: string;
}

export const createBookActions = ({ book, commit, userId: uid }: Deps): BookActions => ({
  addTransaction: (input) => {
    const before = book();
    const result = receipts.addTransaction(before, input);
    const tx = result.transaction;
    commit(result.data, [
      ...derivedOps(before, result.data, uid),
      opInsert('transactions', tx.id, transactionToRow(tx, uid)),
      ...tx.payments.map((p) => opInsert('payments', p.id, paymentToRow(p, tx.id, uid))),
    ]);
    return tx;
  },

  addSupplier: (input) => {
    const before = book();
    const result = parties.addSupplier(before, input);
    commit(result.data, derivedOps(before, result.data, uid));
    return result.supplier;
  },

  updateSupplier: (id, patch) => {
    const next = parties.updateSupplier(book(), id, patch);
    const supplier = next.suppliers.find((s) => s.id === id);
    commit(next, supplier ? [opUpdate('suppliers', id, partyToRow(supplier, uid))] : []);
  },

  deleteSupplier: (supplierId) => {
    commit(parties.deleteSupplier(book(), supplierId), [opSoftDelete('suppliers', supplierId)]);
  },

  addBuyer: (input) => {
    const before = book();
    const result = parties.addBuyer(before, input);
    commit(result.data, derivedOps(before, result.data, uid));
    return result.buyer;
  },

  updateBuyer: (id, patch) => {
    const next = parties.updateBuyer(book(), id, patch);
    const buyer = next.buyers.find((b) => b.id === id);
    commit(next, buyer ? [opUpdate('buyers', id, partyToRow(buyer, uid))] : []);
  },

  deleteBuyer: (buyerId) => {
    commit(parties.deleteBuyer(book(), buyerId), [opSoftDelete('buyers', buyerId)]);
  },

  addProduct: (input) => {
    const result = products.addProduct(book(), input);
    commit(result.data, [
      opInsert('products', result.product.id, productToRow(result.product, uid)),
    ]);
    return result.product;
  },

  updateProduct: (id, patch) => {
    const next = products.updateProduct(book(), id, patch);
    const product = next.products.find((p) => p.id === id);
    commit(next, product ? [opUpdate('products', id, productToRow(product, uid))] : []);
  },

  upsertDraft: (draft) => {
    const before = book();
    const result = drafts.upsertDraft(before, draft);
    const existed = before.drafts.some((d) => d.id === result.draft.id);
    const row = draftToRow(result.draft, uid);
    commit(result.data, [
      existed ? opUpdate('drafts', result.draft.id, row) : opInsert('drafts', result.draft.id, row),
    ]);
    return result.draft;
  },

  deleteDraft: (draftId) => {
    commit(drafts.deleteDraft(book(), draftId), [opSoftDelete('drafts', draftId)]);
  },

  completeDraft: (draftId) => {
    const before = book();
    const result = drafts.completeDraft(before, draftId);
    const tx = result.transaction;
    if (!tx) return null;
    commit(result.data, [
      ...derivedOps(before, result.data, uid),
      opInsert('transactions', tx.id, transactionToRow(tx, uid)),
      ...tx.payments.map((p) => opInsert('payments', p.id, paymentToRow(p, tx.id, uid))),
      opSoftDelete('drafts', draftId),
    ]);
    return tx;
  },

  recordPayment: (txId, amount) => {
    const result = receipts.recordPayment(book(), txId, amount);
    if (!result.payment) return null;
    commit(result.data, [
      opInsert('payments', result.payment.id, paymentToRow(result.payment, txId, uid)),
    ]);
    // Trả về lần trả vừa ghi để màn Công nợ hoàn tác đúng khoản đó, không phải
    // "khoản cuối cùng" — hai máy cùng ghi thì khoản cuối chưa chắc là của mình.
    return result.payment;
  },

  removePayment: (txId, paymentId) => {
    commit(receipts.removePayment(book(), txId, paymentId), [
      opSoftDelete('payments', paymentId),
    ]);
  },

  updateTransactionAttachments: (txId, attachmentIds) => {
    const next = receipts.updateTransactionAttachments(book(), txId, attachmentIds);
    const tx = next.transactions.find((t) => t.id === txId);
    commit(next, tx ? [opUpdate('transactions', txId, transactionToRow(tx, uid))] : []);
  },

  deleteTransaction: (txId) => {
    commit(receipts.deleteTransaction(book(), txId), [opSoftDelete('transactions', txId)]);
  },

  addNote: (body) => {
    const result = notes.addNote(book(), body);
    if (!result.note) return;
    commit(result.data, [opInsert('notes', result.note.id, noteToRow(result.note, uid))]);
  },

  updateNote: (id, patch) => {
    const next = notes.updateNote(book(), id, patch);
    const note = next.notes.find((n) => n.id === id);
    commit(next, note ? [opUpdate('notes', id, noteToRow(note, uid))] : []);
  },

  deleteNote: (id) => {
    commit(notes.deleteNote(book(), id), [opSoftDelete('notes', id)]);
  },

  addPricingRule: (input) => {
    const result = rules.addPricingRule(book(), input);
    commit(result.data, [
      opInsert('pricing_rules', result.rule.id, pricingRuleToRow(result.rule, uid)),
    ]);
    return result.rule;
  },

  updatePricingRule: (id, patch) => {
    const next = rules.updatePricingRule(book(), id, patch);
    const rule = next.pricingRules?.find((r) => r.id === id);
    commit(next, rule ? [opUpdate('pricing_rules', id, pricingRuleToRow(rule, uid))] : []);
  },

  deletePricingRule: (ruleId) => {
    commit(rules.deletePricingRule(book(), ruleId), [opSoftDelete('pricing_rules', ruleId)]);
  },

  // Chế độ xem là lựa chọn của từng máy, không đẩy lên máy chủ.
  updateSettings: (settings) => commit(notes.updateSettings(book(), settings), []),

  reset: () => commit(emptyData(), []),

  importData: (payload) => commit(normalize(payload), []),

  // Cả file vào bằng MỘT commit: một lần ghi sổ, một lượt hàng đợi. Xem lý do
  // đầy đủ ở `useStore.ts`.
  importSuppliers: (rows) => {
    const before = book();
    const result = sheets.importSuppliers(before, rows);
    commit(result.data, derivedOps(before, result.data, uid));
    return result.added.length;
  },

  importReceipts: (rows) => {
    const before = book();
    const result = sheets.importReceipts(before, rows);
    commit(result.data, [
      ...derivedOps(before, result.data, uid),
      ...result.added.flatMap((tx) => [
        opInsert('transactions', tx.id, transactionToRow(tx, uid)),
        ...tx.payments.map((p) => opInsert('payments', p.id, paymentToRow(p, tx.id, uid))),
      ]),
    ]);
    return result.added.length;
  },
});
