/**
 * Bỏ khỏi sổ trên máy một bản ghi máy chủ chưa từng nhận (thao tác thêm mới bị từ chối rồi bị bỏ).
 * Không bỏ thì bản ghi nằm mãi trên máy này mà máy khác không thấy: báo cáo, công nợ lệch giữa các máy.
 */

import type { SyncEntity } from '@mambo/contracts';
import type { AppData } from '@mambo/core/types';

const without = <T extends { readonly id: string }>(list: readonly T[], id: string): T[] =>
  list.filter((item) => item.id !== id);

export const forgetRecord = (book: AppData, entity: SyncEntity, id: string): AppData => {
  switch (entity) {
    case 'supplier': return { ...book, suppliers: without(book.suppliers, id) };
    case 'buyer': return { ...book, buyers: without(book.buyers, id) };
    case 'product': return { ...book, products: without(book.products, id) };
    case 'pricingRule': return { ...book, pricingRules: without(book.pricingRules ?? [], id) };
    case 'note': return { ...book, notes: without(book.notes, id) };
    case 'draft': return { ...book, drafts: without(book.drafts, id) };
    case 'transaction': return { ...book, transactions: without(book.transactions, id) };
    case 'payment': return {
      ...book,
      transactions: book.transactions.map((t) => {
        if (!t.payments.some((p) => p.id === id)) return t;
        const payments = without(t.payments, id);
        return { ...t, payments, amountPaid: payments.reduce((sum, p) => sum + p.amount, 0) };
      }),
    };
  }
};
