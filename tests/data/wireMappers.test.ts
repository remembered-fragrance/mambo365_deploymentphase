import { describe, expect, it } from 'vitest';
import { parseSyncOp } from '@mambo/contracts';
import type { Transaction } from '@mambo/core/types';
import { transactionFromRecord } from '@/data/recordMappers';
import { transactionToInsert } from '@/data/wireMappers';

const ORDER = 'cccccccc-1111-4111-8111-111111111111';

const tx = (patch: Partial<Transaction> = {}): Transaction => ({
  id: 'dddddddd-1111-4111-8111-111111111111',
  date: '2026-10-13T03:00:00.000Z',
  kind: 'purchase',
  counterpartyId: 'aaaaaaaa-1111-4111-8111-111111111111',
  supplierId: 'aaaaaaaa-1111-4111-8111-111111111111',
  supplierName: 'Cô Mai',
  lines: [
    {
      id: 'eeeeeeee-1111-4111-8111-111111111111',
      productName: 'Điều',
      unit: 'kg',
      formulaType: 'standard',
      grossWeight: 1_000,
      pricePerUnit: 10_000,
    },
  ],
  payments: [],
  amountPaid: 0,
  ...patch,
});

const check = (t: Transaction) =>
  parseSyncOp({
    opId: 'ffffffff-1111-4111-8111-111111111111',
    seq: 1,
    entity: 'transaction',
    kind: 'insert',
    recordId: t.id,
    data: transactionToInsert(t),
  });

describe('phiếu theo đơn — op gửi lên khớp hợp đồng', () => {
  it('có orderId: op hợp lệ và mang đúng orderId', () => {
    const result = check(tx({ orderId: ORDER }));
    expect(result.ok).toBe(true);
    expect(transactionToInsert(tx({ orderId: ORDER })).orderId).toBe(ORDER);
  });

  it('không theo đơn: vẫn hợp lệ (orderId null)', () => {
    expect(check(tx()).ok).toBe(true);
  });

  it('kéo về: orderId của máy chủ vào lại phiếu, null thì bỏ', () => {
    const record = { ...transactionToInsert(tx({ orderId: ORDER })), id: tx().id, createdBy: null, createdAt: tx().date, updatedAt: tx().date, deletedAt: null };
    expect(transactionFromRecord(record as never, []).orderId).toBe(ORDER);
    expect(transactionFromRecord({ ...record, orderId: null } as never, []).orderId).toBeUndefined();
  });
});
