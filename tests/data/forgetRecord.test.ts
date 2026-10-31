import { describe, expect, it } from 'vitest';
import { emptyData } from '@mambo/core/normalize';
import type { Transaction } from '@mambo/core/types';
import { forgetRecord } from '@/data/forgetRecord';

const tx = {
  id: 'tx-1',
  payments: [{ id: 'pay-1', amount: 100_000 }, { id: 'pay-2', amount: 50_000 }],
  amountPaid: 150_000,
} as unknown as Transaction;

describe('forgetRecord — bỏ bản ghi máy chủ chưa từng nhận', () => {
  it('bỏ lần trả tiền thì số đã trả tính lại', () => {
    const book = forgetRecord({ ...emptyData(), transactions: [tx] }, 'payment', 'pay-1');
    expect(book.transactions[0]?.payments.map((p) => p.id)).toEqual(['pay-2']);
    expect(book.transactions[0]?.amountPaid).toBe(50_000);
  });

  it('bỏ phiếu chỉ bỏ đúng phiếu đó', () => {
    const other = { ...tx, id: 'tx-2' };
    const book = forgetRecord({ ...emptyData(), transactions: [tx, other] }, 'transaction', 'tx-1');
    expect(book.transactions.map((t) => t.id)).toEqual(['tx-2']);
  });
});
