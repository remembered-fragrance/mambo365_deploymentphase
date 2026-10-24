import { describe, expect, it } from 'vitest';
import { parseSyncOp } from '@mambo/contracts';
import type { DraftReceipt, PriceAdjustment, Transaction } from '@mambo/core/types';
import { draftFromRecord, pricingRuleFromRecord, productFromRecord, transactionFromRecord } from '@/data/recordMappers';
import { draftToInsert, draftToPatch, paymentToInsert, pricingRuleToInsert, pricingRuleToPatch, productToInsert, productToPatch, transactionToInsert } from '@/data/wireMappers';

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

describe('tiền lẻ có sẵn trong máy — làm tròn khi gửi, op không bị từ chối', () => {
  const opOk = (entity: 'payment' | 'pricingRule' | 'draft' | 'transaction', kind: 'insert' | 'update', data: unknown) =>
    parseSyncOp({ opId: 'ffffffff-1111-4111-8111-111111111111', seq: 1, entity, kind, recordId: 'bbbbbbbb-1111-4111-8111-111111111111', data }).ok;

  it('lần trả', () => {
    const data = paymentToInsert({ id: 'p1', date: '2026-10-17T03:00:00.000Z', amount: 500_000.5 }, 'dddddddd-1111-4111-8111-111111111111');
    expect(data.amount).toBe(500_001);
    expect(opOk('payment', 'insert', data)).toBe(true);
  });

  it('khoản cộng/trừ và hẹn trả của phiếu', () => {
    const t = tx({
      adjustments: [{ id: 'a1', kind: 'manual', label: 'Tiền xe', amount: -50_000.4 }],
      creditTerms: [{ dueDate: '2026-11-01T00:00:00.000Z', amount: 100_000.6 }],
    });
    const data = transactionToInsert(t);
    expect(data.adjustments?.[0]?.amount).toBe(-50_000);
    expect(data.creditTerms?.[0]?.amount).toBe(100_001);
    expect(check(t).ok).toBe(true);
  });

  it('nháp: khoản và số định trả', () => {
    const base = { id: 'bbbbbbbb-1111-4111-8111-111111111111', status: 'draft' as const, supplierName: 'A', lines: [], createdAt: '2026-10-17T03:00:00.000Z', updatedAt: '2026-10-17T03:00:00.000Z' };
    const insert = draftToInsert({ ...base, amountPaid: 1_000.5, adjustments: [{ id: 'a1', kind: 'manual', label: 'x', amount: 30_000.5 }] });
    expect(insert.amountPaid).toBe(1_001);
    expect(insert.adjustments?.[0]?.amount).toBe(30_001);
    expect(opOk('draft', 'insert', insert)).toBe(true);
    const patch = draftToPatch({ amountPaid: 2_000.4 });
    expect(patch).toEqual({ amountPaid: 2_000 });
    expect(opOk('draft', 'update', patch)).toBe(true);
  });

  it('quy tắc giá: tiền cố định', () => {
    const insert = pricingRuleToInsert({ id: 'r1', name: 'Tiền xe', kind: 'logistics', fixedAmount: -50_000.6, active: true });
    expect(insert.fixedAmount).toBe(-50_001);
    expect(opOk('pricingRule', 'insert', insert)).toBe(true);
    expect(pricingRuleToInsert({ id: 'r2', name: 'Hao', kind: 'logistics', percentOfTotal: 1.5, active: true }).fixedAmount).toBeNull();
    expect(pricingRuleToPatch({ fixedAmount: 20_000.5 })).toEqual({ fixedAmount: 20_001 });
  });
});

describe('Gói Pro Đợt 1b — chỉ tiêu chất lượng, loại mủ, quy tắc theo chỉ tiêu', () => {
  const tieu = {
    id: 'eeeeeeee-2222-4111-8111-111111111111',
    productName: 'Tiêu',
    unit: 'kg',
    formulaType: 'netAfterTare' as const,
    grossWeight: 1_010,
    tareWeight: 10,
    pricePerUnit: 150_000,
    bulkDensity: 520,
    moisturePercent: 14,
  };
  const muChen = {
    id: 'eeeeeeee-3333-4111-8111-111111111111',
    productName: 'Mủ chén',
    unit: 'kg',
    formulaType: 'rubberLatex' as const,
    rubberKind: 'cuplump' as const,
    grossWeight: 500,
    qualityPercent: 55,
    pricePerUnit: 30_000,
  };

  it('phiếu mang chỉ tiêu và loại mủ lên máy chủ; dòng không đo gì gửi y như trước', () => {
    const lines = transactionToInsert(tx({ lines: [tieu, muChen, ...tx().lines] })).lines;
    expect(lines[0]).toMatchObject({ bulkDensity: 520, moisturePercent: 14 });
    expect(lines[1]).toMatchObject({ rubberKind: 'cuplump', qualityPercent: 55 });
    expect(Object.keys(lines[2] ?? {})).not.toContain('bulkDensity');
    expect(Object.keys(lines[2] ?? {})).not.toContain('rubberKind');
    expect(check(tx({ lines: [tieu, muChen] })).ok).toBe(true);
  });

  it('nháp cũng mang chỉ tiêu', () => {
    const draft = { id: 'd', status: 'draft' as const, supplierName: '', lines: [tieu], amountPaid: 0, createdAt: '', updatedAt: '' };
    expect(draftToInsert(draft).lines[0]).toMatchObject({ bulkDensity: 520, moisturePercent: 14 });
  });

  it('quy tắc theo chỉ tiêu: gửi bảng mốc; quy tắc thường gửi null', () => {
    const steps = [{ from: 500, amountPerUnit: 0 }, { from: 520, amountPerUnit: 1_500 }];
    const insert = pricingRuleToInsert({ id: 'q', name: 'Dung trọng', kind: 'manual', active: true, qualityMetric: 'bulkDensity', qualitySteps: steps });
    expect(insert).toMatchObject({ qualityMetric: 'bulkDensity', qualitySteps: steps });
    const op = { opId: 'ffffffff-1111-4111-8111-111111111111', seq: 1, entity: 'pricingRule', kind: 'insert', recordId: 'bbbbbbbb-1111-4111-8111-111111111111', data: insert };
    expect(parseSyncOp(op).ok).toBe(true);
    expect(pricingRuleToInsert({ id: 'x', name: 'Xe', kind: 'logistics', active: true, fixedAmount: -1_000 })).toMatchObject({ qualityMetric: null, qualitySteps: null });
    expect(pricingRuleToPatch({ qualitySteps: steps })).toEqual({ qualitySteps: steps });
  });

  it('mặt hàng: mủ tạp gửi lên; đổi về mủ nước thì gỡ (null), không đụng thì không gửi', () => {
    expect(productToInsert({ id: 'p', name: 'Mủ chén', unit: 'kg', formulaType: 'rubberLatex', isSuggested: false, isActive: true, rubberKind: 'cuplump' }).rubberKind).toBe('cuplump');
    expect(productToPatch({ rubberKind: undefined })).toEqual({ rubberKind: null });
    expect(productToPatch({ name: 'Mủ chén' })).toEqual({ name: 'Mủ chén' });
  });

  it('kéo về: quy tắc và mặt hàng của máy chủ cũ (không có trường mới) vẫn đọc được', () => {
    const meta = { id: 'q', createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null };
    const rule = pricingRuleFromRecord({ ...meta, name: 'Xe', kind: 'logistics', productId: null, fixedAmount: -1, percentOfTotal: null, minWeightKg: null, appliesOnPickup: null, active: true } as never);
    expect(rule.qualityMetric).toBeUndefined();
    const product = productFromRecord({ ...meta, name: 'Mủ', unit: 'kg', formulaType: 'rubberLatex', isSuggested: false, isActive: true, crop: null, lastPricePerUnit: null, group: null, qualityGrades: [], trackInventory: null, rubberKind: 'cuplump' });
    expect(product.rubberKind).toBe('cuplump');
  });
});
