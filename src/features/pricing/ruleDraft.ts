/**
 * Bản nháp của một quy tắc giá khi đang gõ dở.
 *
 * Trên form mọi con số là CHUỖI (người dùng đang gõ), và dấu âm không bao giờ
 * do người dùng gõ mà do lựa chọn "Cộng thêm / Trừ bớt" quyết định. Đổi qua
 * lại giữa hai dạng nằm gọn ở đây để form chỉ lo phần hiển thị.
 */

import { newId } from '@mambo/core/id';
import { parseNumber } from '@mambo/core/parseNumber';
import type { PricingRule, PricingRuleKind, QualityMetric, QualityStep } from '@mambo/core/types';
import { parseMoney } from '../shared/money';

export type RuleDirection = 'add' | 'subtract';
export type RuleTransport = 'both' | 'pickup' | 'bring';
/** `amount`: khoản cộng/trừ như trước · `quality`: theo chỉ tiêu chất lượng (V19). Chỉ chọn khi tạo mới. */
export type RuleMode = 'amount' | 'quality';

/** Một mốc khi đang gõ. Như tiền ở trên: người dùng không gõ dấu âm, chọn "Cộng / Trừ". */
export interface StepDraft {
  readonly key: string;
  readonly from: string;
  readonly direction: RuleDirection;
  readonly amount: string;
}

export interface RuleDraft {
  readonly id?: string;
  readonly name: string;
  readonly kind: PricingRuleKind;
  /** Rỗng nghĩa là áp cho mọi mặt hàng. */
  readonly productId: string;
  readonly direction: RuleDirection;
  readonly fixedAmount: string;
  readonly percent: string;
  readonly minWeightKg: string;
  readonly transport: RuleTransport;
  readonly active: boolean;
  readonly mode: RuleMode;
  readonly metric: QualityMetric;
  readonly steps: readonly StepDraft[];
}

export const emptyStep = (): StepDraft => ({ key: newId(), from: '', direction: 'subtract', amount: '' });

export const emptyRuleDraft = (productId = ''): RuleDraft => ({
  name: '',
  kind: 'logistics',
  productId,
  direction: 'subtract',
  fixedAmount: '',
  percent: '',
  minWeightKg: '',
  transport: 'both',
  active: true,
  mode: 'amount',
  metric: 'bulkDensity',
  steps: [emptyStep()],
});

const transportOf = (appliesOnPickup?: boolean | null): RuleTransport =>
  appliesOnPickup === true ? 'pickup' : appliesOnPickup === false ? 'bring' : 'both';

const digitsOf = (value?: number): string =>
  value === undefined ? '' : String(Math.abs(value)).replace('.', ',');

export const draftFromRule = (rule: PricingRule): RuleDraft => {
  const signed = rule.fixedAmount ?? rule.percentOfTotal ?? 0;
  return {
    id: rule.id,
    name: rule.name,
    kind: rule.kind,
    productId: rule.productId ?? '',
    direction: signed < 0 ? 'subtract' : 'add',
    fixedAmount: digitsOf(rule.fixedAmount),
    percent: digitsOf(rule.percentOfTotal),
    minWeightKg: digitsOf(rule.minWeightKg),
    transport: transportOf(rule.appliesOnPickup),
    active: rule.active,
    mode: rule.qualityMetric ? 'quality' : 'amount',
    metric: rule.qualityMetric ?? 'bulkDensity',
    steps: rule.qualitySteps?.length
      ? rule.qualitySteps.map((s) => ({
          key: newId(),
          from: digitsOf(s.from),
          direction: s.amountPerUnit < 0 ? 'subtract' : 'add',
          amount: digitsOf(s.amountPerUnit),
        }))
      : [emptyStep()],
  };
};

/** Mốc đủ số (có "Từ" và số tiền), tăng dần. Mốc gõ dở thì bỏ, không lưu số 0 bừa. */
export const stepsOf = (draft: Pick<RuleDraft, 'steps'>): QualityStep[] =>
  draft.steps
    .filter((s) => s.from.trim() !== '' && s.amount.trim() !== '')
    .map((s) => ({
      from: parseNumber(s.from),
      amountPerUnit: (s.direction === 'subtract' ? -1 : 1) * parseMoney(s.amount),
    }))
    .sort((a, b) => a.from - b.from);

export const toRule = (draft: RuleDraft): Omit<PricingRule, 'id'> => {
  if (draft.mode === 'quality') {
    return {
      name: draft.name.trim(),
      kind: 'manual',
      productId: draft.productId || undefined,
      appliesOnPickup: null,
      active: draft.active,
      qualityMetric: draft.metric,
      qualitySteps: stepsOf(draft),
    };
  }
  const sign = draft.direction === 'subtract' ? -1 : 1;
  const fixed = parseMoney(draft.fixedAmount);
  const percent = parseNumber(draft.percent);
  const minWeight = parseNumber(draft.minWeightKg);

  return {
    name: draft.name.trim(),
    kind: draft.kind,
    productId: draft.productId || undefined,
    fixedAmount: fixed > 0 ? sign * fixed : undefined,
    percentOfTotal: percent > 0 ? sign * percent : undefined,
    minWeightKg: minWeight > 0 ? minWeight : undefined,
    appliesOnPickup: draft.transport === 'both' ? null : draft.transport === 'pickup',
    active: draft.active,
  };
};
