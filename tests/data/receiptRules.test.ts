/**
 * Quy tắc giá trên phiếu chưa chốt: quy tắc kiểu cũ (phí xe, bớt giá khi mua nhiều, tự đặt) tự áp như quy tắc
 * theo chất lượng; thanh "Đang cân" / tab "Để dành" ra đúng Tổng phiếu; gỡ mặt hàng / số tiền của quy tắc phải lên
 * máy chủ.
 */

import { describe, expect, it } from 'vitest';
import { emptyData } from '@mambo/core/normalize';
import type { DraftReceipt, PricingRule, TransactionLine } from '@mambo/core/types';
import { pricingRuleToPatch } from '@/data/wireMappers';
import { draftFromRule, toRule } from '@/features/pricing/ruleDraft';
import { adjustmentsFromRules, draftTotal, receiptAdjustments, receiptRules, rulesForKind } from '@/data/receiptRules';
import { droppedItems } from '@/data/sync';

const rule = (over: Partial<PricingRule>): PricingRule => ({
  id: 'r-1',
  name: 'Mua từ 500 kg bớt 1%',
  kind: 'volumeDiscount',
  percentOfTotal: -1,
  minWeightKg: 500,
  appliesOnPickup: null,
  active: true,
  ...over,
});

const moisture = rule({
  id: 'r-q',
  name: 'Độ ẩm',
  kind: 'manual',
  percentOfTotal: undefined,
  minWeightKg: undefined,
  qualityMetric: 'moisturePercent',
  qualitySteps: [{ from: 14, amountPerUnit: -2_000 }],
});

const line = (over: Partial<TransactionLine> = {}): TransactionLine => ({
  id: 'l-1',
  productId: 'p-1',
  productName: 'Cà phê nhân',
  unit: 'kg',
  formulaType: 'standard',
  grossWeight: 1_000,
  pricePerUnit: 100_000,
  ...over,
});

describe('quy tắc phiếu đọc tới', () => {
  it('quy tắc kiểu cũ dùng cả khi hết gói; theo chất lượng cần gói; quy tắc tắt thì thôi', () => {
    const all = [rule({}), moisture, rule({ id: 'r-off', active: false })];
    expect(receiptRules(all, false).map((r) => r.id)).toEqual(['r-1']);
    expect(receiptRules(all, true).map((r) => r.id)).toEqual(['r-1', 'r-q']);
  });
});

describe('khoản tự áp', () => {
  it('1.000 kg × 100.000đ, quy tắc "từ 500 kg bớt 1%" → trừ 1.000.000đ; 400 kg thì không', () => {
    expect(adjustmentsFromRules([rule({})], [line()], []).applied).toEqual([
      { id: 'rule-r-1', kind: 'volumeDiscount', label: 'Mua từ 500 kg bớt 1%', amount: -1_000_000, ruleId: 'r-1' },
    ]);
    expect(adjustmentsFromRules([rule({})], [line({ grossWeight: 400 })], []).applied).toEqual([]);
  });

  it('quy tắc chỉ cho xe đến lấy / tự mang tới: không tự áp, chỉ mời', () => {
    const fee = rule({ id: 'r-xe', name: 'Phí xe', kind: 'logistics', percentOfTotal: undefined, minWeightKg: undefined, fixedAmount: -200_000, appliesOnPickup: true });
    const bonus = rule({ id: 'r-mang', name: 'Tự chở tới', kind: 'manual', percentOfTotal: undefined, minWeightKg: undefined, fixedAmount: 50_000, appliesOnPickup: false });
    const { applied, offered } = adjustmentsFromRules([fee, bonus], [line()], []);
    expect(applied).toEqual([]);
    expect(offered.map((o) => [o.adjustment.ruleId, o.adjustment.amount, o.pickup])).toEqual([
      ['r-xe', -200_000, true],
      ['r-mang', 50_000, false],
    ]);
  });

  it('quy tắc đã nhận thì không áp lại, không mời lại', () => {
    const taken = (ruleId: string) => ({ id: `m-${ruleId}`, kind: 'volumeDiscount' as const, label: 'Bớt', amount: -1_000_000, ruleId });
    const { applied, offered, accepted } = adjustmentsFromRules([rule({}), rule({ id: 'r-2', appliesOnPickup: true })], [line()], [taken('r-1'), taken('r-2')]);
    expect([applied, offered]).toEqual([[], []]);
    expect(accepted).toHaveLength(2);
  });
});

describe('lời mời đã nhận', () => {
  // "Xe đến lấy từ 500 kg: trừ 1% tiền hàng" — nhận lúc phiếu 1.000 kg (−1.000.000đ).
  const pickup = rule({ id: 'r-xe', name: 'Xe đến lấy', kind: 'logistics', appliesOnPickup: true });
  const taken = [{ id: 'm-1', kind: 'logistics' as const, label: 'Xe đến lấy', amount: -1_000_000, ruleId: 'r-xe' }];

  it('sửa số cân thì số tiền tính lại, không giữ số lúc bấm', () => {
    expect(adjustmentsFromRules([pickup], [line({ grossWeight: 2_000 })], taken).accepted).toEqual([
      { id: 'm-1', kind: 'logistics', label: 'Xe đến lấy', amount: -2_000_000, ruleId: 'r-xe' },
    ]);
  });

  it('xuống dưới ngưỡng: còn trên phiếu (0đ, "chưa đủ điều kiện") nhưng không ghi lên phiếu lúc chốt', () => {
    const adjusted = adjustmentsFromRules([pickup], [line({ grossWeight: 400 })], taken);
    expect(adjusted.accepted.map((a) => a.amount)).toEqual([0]);
    expect(receiptAdjustments(adjusted)).toEqual([]);
  });

  it('quy tắc đã tắt / xoá sau khi nhận: giữ đúng số lúc nhận', () => {
    expect(adjustmentsFromRules([], [line({ grossWeight: 2_000 })], taken).accepted).toEqual(taken);
  });
});

describe('phiếu bán', () => {
  it('không áp quy tắc giá', () => {
    expect(rulesForKind([rule({})], 'sale')).toEqual([]);
    expect(rulesForKind([rule({})], 'purchase')).toHaveLength(1);
    expect(rulesForKind([rule({})], undefined)).toHaveLength(1);
  });
});

describe('tổng của nháp = Tổng phiếu', () => {
  const draft = (over: Partial<DraftReceipt>): DraftReceipt => ({
    id: 'd-1',
    status: 'draft',
    supplierName: 'Anh Ba',
    lines: [line({ productName: 'Tiêu đen', grossWeight: 1_000, pricePerUnit: 150_000, moisturePercent: 14 })],
    amountPaid: 0,
    createdAt: '',
    updatedAt: '',
    ...over,
  });

  it('cộng cả khoản gõ tay và khoản tự áp (chất lượng + kiểu cũ)', () => {
    const rules = [moisture, rule({})];
    // 150tr − 2tr (ẩm 14%) − 1,5tr (bớt 1%) − 100k (gõ tay)
    expect(draftTotal(draft({ adjustments: [{ id: 'm', kind: 'manual', label: 'Tiền bao', amount: -100_000 }] }), rules)).toBe(146_400_000);
  });

  it('nháp phiếu bán: không trừ theo quy tắc', () => {
    expect(draftTotal(draft({ kind: 'sale' }), [moisture, rule({})])).toBe(150_000_000);
  });

  it('thông báo thay đổi bị bỏ ghi đúng số của thanh "Đang cân"', () => {
    const d = draft({});
    const book = { ...emptyData(), drafts: [d], pricingRules: [moisture, rule({})] };
    const op = { entity: 'draft', kind: 'update', recordId: 'd-1' };
    expect(droppedItems([op] as never, book)[0]?.amount).toBe(draftTotal(d, [moisture, rule({})]));
    expect(draftTotal(d, [moisture, rule({})])).toBe(146_500_000);
  });

  it('dòng chưa đủ số không tính, giống màn lập phiếu', () => {
    expect(draftTotal(draft({ lines: [line({ grossWeight: 0 })] }), [rule({ minWeightKg: undefined, fixedAmount: 50_000, percentOfTotal: undefined })])).toBe(0);
  });
});

describe('sửa quy tắc giá gửi lên máy chủ', () => {
  it('đổi về "Mọi mặt hàng" gửi productId null; xoá số kg / số tiền gửi null', () => {
    const edited = toRule({ ...draftFromRule(rule({ productId: 'p-1', fixedAmount: -50_000 })), productId: '', fixedAmount: '', minWeightKg: '' });
    expect(pricingRuleToPatch(edited)).toMatchObject({ productId: null, fixedAmount: null, minWeightKg: null, percentOfTotal: -1 });
  });

  it('bật / tắt chỉ gửi khoá active', () => {
    expect(pricingRuleToPatch({ active: false })).toEqual({ active: false });
  });
});
