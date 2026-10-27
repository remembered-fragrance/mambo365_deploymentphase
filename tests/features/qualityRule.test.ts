/**
 * Quy tắc giá theo chất lượng (V19) ở phía app: form bảng mốc → quy tắc, quy tắc → ô hỏi trên phiếu, và dòng
 * phiếu → chữ trên biên nhận. Cách tính tiền đã có test ở `@mambo/core` (qualityPricing.test.ts).
 */

import { describe, expect, it } from 'vitest';
import type { PricingRule } from '@mambo/core/types';
import { metricsForProduct, metricValueText, qualityText } from '@/features/pricing/quality';
import { draftFromRule, emptyRuleDraft, stepsOf, toRule, type StepDraft } from '@/features/pricing/ruleDraft';

const step = (from: string, direction: StepDraft['direction'], amount: string): StepDraft => ({
  key: from,
  from,
  direction,
  amount,
});

describe('bảng mốc khi đang gõ', () => {
  it('dấu do "Cộng / Trừ" quyết định, mốc xếp tăng dần, mốc gõ dở bị bỏ', () => {
    const draft = {
      ...emptyRuleDraft(),
      steps: [step('520', 'add', '1.500'), step('480', 'subtract', '1.500'), step('500', 'add', ''), step('', 'add', '9')],
    };
    expect(stepsOf(draft)).toEqual([
      { from: 480, amountPerUnit: -1_500 },
      { from: 520, amountPerUnit: 1_500 },
    ]);
  });

  it('kiểu chất lượng: không mang tiền cố định / % / xe của kiểu kia', () => {
    const draft = {
      ...emptyRuleDraft('tieu'),
      name: ' Độ ẩm ',
      mode: 'quality' as const,
      metric: 'moisturePercent' as const,
      fixedAmount: '50.000',
      transport: 'pickup' as const,
      steps: [step('13,6', 'subtract', '1.000')],
    };
    expect(toRule(draft)).toEqual({
      name: 'Độ ẩm',
      kind: 'manual',
      productId: 'tieu',
      appliesOnPickup: null,
      active: true,
      qualityMetric: 'moisturePercent',
      qualitySteps: [{ from: 13.6, amountPerUnit: -1_000 }],
    });
  });

  it('mở lại quy tắc đã lưu: về đúng kiểu, chỉ tiêu, mốc', () => {
    const rule: PricingRule = {
      id: 'q',
      name: 'Dung trọng',
      kind: 'manual',
      active: true,
      qualityMetric: 'bulkDensity',
      qualitySteps: [
        { from: 480, amountPerUnit: -1_500 },
        { from: 520, amountPerUnit: 1_500 },
      ],
    };
    const draft = draftFromRule(rule);
    expect(draft.mode).toBe('quality');
    expect(draft.steps.map(({ from, direction, amount }) => [from, direction, amount])).toEqual([
      ['480', 'subtract', '1500'],
      ['520', 'add', '1500'],
    ]);
    expect(toRule(draft)).toMatchObject({ qualityMetric: 'bulkDensity', qualitySteps: rule.qualitySteps });
  });

  it('quy tắc cũ mở ra vẫn là khoản cộng / trừ, có sẵn một mốc trống', () => {
    const draft = draftFromRule({ id: 'x', name: 'Xe', kind: 'logistics', active: true, fixedAmount: -50_000 });
    expect(draft.mode).toBe('amount');
    expect(draft.steps).toHaveLength(1);
    expect(toRule(draft).qualityMetric).toBeUndefined();
  });
});

describe('ô chỉ tiêu nào hiện trên phiếu', () => {
  const rules: PricingRule[] = [
    { id: '1', name: 'Dung trọng', kind: 'manual', active: true, productId: 'tieu', qualityMetric: 'bulkDensity', qualitySteps: [] },
    { id: '2', name: 'Ẩm chung', kind: 'manual', active: true, qualityMetric: 'moisturePercent', qualitySteps: [] },
    { id: '3', name: 'KOR tắt', kind: 'manual', active: false, qualityMetric: 'kor', qualitySteps: [] },
    { id: '4', name: 'Bậc TSC', kind: 'manual', active: true, qualityMetric: 'qualityPercent', qualitySteps: [] },
    { id: '5', name: 'Phí xe', kind: 'logistics', active: true, fixedAmount: -1 },
  ];

  it('chỉ chỉ tiêu có quy tắc đang bật đọc tới; độ mủ đã có ô riêng', () => {
    expect(metricsForProduct(rules, 'tieu')).toEqual(['bulkDensity', 'moisturePercent']);
    expect(metricsForProduct(rules, 'dieu')).toEqual(['moisturePercent']);
    expect(metricsForProduct(rules, undefined)).toEqual(['moisturePercent']);
  });

  it('vựa không khai bảng mốc nào: phiếu không thêm ô nào', () => {
    expect(metricsForProduct(rules.slice(4), 'tieu')).toEqual([]);
  });
});

describe('chữ trên biên nhận', () => {
  const base = { id: 'l', productName: 'Tiêu', unit: 'kg', formulaType: 'netAfterTare' as const, grossWeight: 1, pricePerUnit: 1 };

  it('ghi chỉ tiêu đã đo, kiểu số Việt', () => {
    expect(qualityText({ ...base, bulkDensity: 520, moisturePercent: 13.5 })).toBe('Dung trọng 520 g/l · Độ ẩm 13,5%');
  });

  it('ảnh phiếu và biên nhận viết chỉ tiêu cùng một kiểu', () => {
    expect(metricValueText('moisturePercent', 13.5)).toBe('13,5%');
    expect(metricValueText('bulkDensity', 520)).toBe('520 g/l');
  });

  it('mủ tạp ghi DRC; mủ nước và dòng không đo gì không thêm chữ', () => {
    expect(qualityText({ ...base, formulaType: 'rubberLatex', rubberKind: 'cuplump', qualityPercent: 55 })).toBe('DRC 55%');
    expect(qualityText({ ...base, formulaType: 'rubberLatex', qualityPercent: 30 })).toBe('');
    expect(qualityText(base)).toBe('');
  });
});
