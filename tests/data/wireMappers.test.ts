import { describe, expect, it } from 'vitest';
import { parseSyncOp } from '@mambo/contracts';
import type { DraftReceipt, PriceAdjustment, Transaction } from '@mambo/core/types';
import { draftFromRecord, transactionFromRecord } from '@/data/recordMappers';
import { draftToInsert, draftToPatch, transactionToInsert } from '@/data/wireMappers';

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

describe('nháp — khoản cộng/trừ đi lên máy chủ và về lại', () => {
  const XE: PriceAdjustment = { id: 'a1', kind: 'manual', label: 'Tiền xe', amount: -50_000 };
  const draft = (patch: Partial<DraftReceipt> = {}): DraftReceipt => ({
    id: 'bbbbbbbb-1111-4111-8111-111111111111',
    status: 'waiting',
    kind: 'sale',
    supplierName: 'Chị Lan',
    lines: [],
    amountPaid: 0,
    createdAt: '2026-10-17T03:00:00.000Z',
    updatedAt: '2026-10-17T03:00:00.000Z',
    ...patch,
  });
  const valid = (kind: 'insert' | 'update', data: unknown) =>
    parseSyncOp({ opId: 'ffffffff-1111-4111-8111-111111111111', seq: 1, entity: 'draft', kind, recordId: draft().id, data }).ok;

  it('thêm nháp có khoản: op hợp lệ, mang đủ khoản', () => {
    const data = draftToInsert(draft({ adjustments: [XE] }));
    expect(valid('insert', data)).toBe(true);
    expect(data.adjustments).toEqual([XE]);
  });

  it('không có khoản nào: gửi null, không gửi mảng rỗng', () => {
    expect(draftToInsert(draft()).adjustments).toBeNull();
    expect(draftToInsert(draft({ adjustments: [] })).adjustments).toBeNull();
  });

  it('sửa nháp: gỡ hết khoản / xoá ghi chú / bỏ khách đều lên máy chủ là null', () => {
    const data = draftToPatch(draft({ adjustments: [], note: '', counterpartyId: undefined }));
    expect(valid('update', data)).toBe(true);
    expect(data).toMatchObject({ adjustments: null, note: null, counterpartyId: null });
  });

  it('người gọi không đụng tới trường nào thì không gửi trường đó', () => {
    expect(draftToPatch({ status: 'draft' })).toEqual({ status: 'draft' });
  });

  it('kéo về: khoản của máy chủ vào lại nháp, null thì bỏ', () => {
    const record = { ...draftToInsert(draft({ adjustments: [XE] })), id: draft().id, branchId: null, createdBy: 'x', createdAt: draft().createdAt, updatedAt: draft().updatedAt, deletedAt: null };
    expect(draftFromRecord(record as never).adjustments).toEqual([XE]);
    expect(draftFromRecord({ ...record, adjustments: null } as never).adjustments).toBeUndefined();
  });
});
