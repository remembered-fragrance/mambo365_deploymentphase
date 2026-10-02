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
  draftToInsert,
  draftToPatch,
  noteToInsert,
  noteToPatch,
  partyToPatch,
  paymentToInsert,
  pricingRuleToInsert,
  pricingRuleToPatch,
  productToInsert,
  productToPatch,
  transactionToInsert,
  transactionToPatch,
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
      opInsert('transaction', tx.id, transactionToInsert(tx)),
      ...tx.payments.map((p) => opInsert('payment', p.id, paymentToInsert(p, tx.id))),
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
    commit(next, [opUpdate('supplier', id, partyToPatch(patch))]);
  },

  deleteSupplier: (supplierId) => {
    commit(parties.deleteSupplier(book(), supplierId), [opSoftDelete('supplier', supplierId)]);
  },

  addBuyer: (input) => {
    const before = book();
    const result = parties.addBuyer(before, input);
    commit(result.data, derivedOps(before, result.data, uid));
    return result.buyer;
  },

  updateBuyer: (id, patch) => {
    const next = parties.updateBuyer(book(), id, patch);
    commit(next, [opUpdate('buyer', id, partyToPatch(patch))]);
  },

  deleteBuyer: (buyerId) => {
    commit(parties.deleteBuyer(book(), buyerId), [opSoftDelete('buyer', buyerId)]);
  },

  addProduct: (input) => {
    const result = products.addProduct(book(), input);
    commit(result.data, [
      opInsert('product', result.product.id, productToInsert(result.product)),
    ]);
    return result.product;
  },

  updateProduct: (id, patch) => {
    const next = products.updateProduct(book(), id, patch);
    commit(next, [opUpdate('product', id, productToPatch(patch))]);
  },

  upsertDraft: (draft) => {
    const before = book();
    const result = drafts.upsertDraft(before, draft);
    const existed = before.drafts.some((d) => d.id === result.draft.id);
    commit(result.data, [
      existed
        ? opUpdate('draft', result.draft.id, draftToPatch(result.draft))
        : opInsert('draft', result.draft.id, draftToInsert(result.draft)),
    ]);
    return result.draft;
  },

  deleteDraft: (draftId) => {
    commit(drafts.deleteDraft(book(), draftId), [opSoftDelete('draft', draftId)]);
  },

  completeDraft: (draftId) => {
    const before = book();
    const result = drafts.completeDraft(before, draftId);
    const tx = result.transaction;
    if (!tx) return null;
    commit(result.data, [
      ...derivedOps(before, result.data, uid),
      opInsert('transaction', tx.id, transactionToInsert(tx)),
      ...tx.payments.map((p) => opInsert('payment', p.id, paymentToInsert(p, tx.id))),
      opSoftDelete('draft', draftId),
    ]);
    return tx;
  },

  recordPayment: (txId, amount) => {
    const result = receipts.recordPayment(book(), txId, amount);
    if (!result.payment) return null;
    commit(result.data, [
      opInsert('payment', result.payment.id, paymentToInsert(result.payment, txId)),
    ]);
    return result.payment;
  },

  removePayment: (txId, paymentId) => {
    commit(receipts.removePayment(book(), txId, paymentId), [
      opSoftDelete('payment', paymentId),
    ]);
  },

  updateTransactionAttachments: (txId, attachmentIds) => {
    const next = receipts.updateTransactionAttachments(book(), txId, attachmentIds);
    commit(next, [opUpdate('transaction', txId, transactionToPatch({ attachmentIds }))]);
  },

  deleteTransaction: (txId) => {
    commit(receipts.deleteTransaction(book(), txId), [opSoftDelete('transaction', txId)]);
  },

  addNote: (body) => {
    const result = notes.addNote(book(), body);
    if (!result.note) return;
    commit(result.data, [opInsert('note', result.note.id, noteToInsert(result.note))]);
  },

  updateNote: (id, patch) => {
    const next = notes.updateNote(book(), id, patch);
    commit(next, [opUpdate('note', id, noteToPatch(patch))]);
  },

  deleteNote: (id) => {
    commit(notes.deleteNote(book(), id), [opSoftDelete('note', id)]);
  },

  addPricingRule: (input) => {
    const result = rules.addPricingRule(book(), input);
    commit(result.data, [
      opInsert('pricingRule', result.rule.id, pricingRuleToInsert(result.rule)),
    ]);
    return result.rule;
  },

  updatePricingRule: (id, patch) => {
    const next = rules.updatePricingRule(book(), id, patch);
    commit(next, [opUpdate('pricingRule', id, pricingRuleToPatch(patch))]);
  },

  deletePricingRule: (ruleId) => {
    commit(rules.deletePricingRule(book(), ruleId), [opSoftDelete('pricingRule', ruleId)]);
  },

  // Chế độ xem là lựa chọn của từng máy, không đẩy lên máy chủ.
  updateSettings: (settings) => commit(notes.updateSettings(book(), settings), []),

  reset: () => commit(emptyData(), []),

  importData: (payload) => commit(normalize(payload), []),

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
        opInsert('transaction', tx.id, transactionToInsert(tx)),
        ...tx.payments.map((p) => opInsert('payment', p.id, paymentToInsert(p, tx.id))),
      ]),
    ]);
    return result.added.length;
  },
});
