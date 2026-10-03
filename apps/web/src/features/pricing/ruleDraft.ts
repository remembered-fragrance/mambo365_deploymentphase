/**
 * Bản nháp của một quy tắc giá khi đang gõ dở.
 *
 * Trên form mọi con số là CHUỖI (người dùng đang gõ), và dấu âm không bao giờ
 * do người dùng gõ mà do lựa chọn "Cộng thêm / Trừ bớt" quyết định. Đổi qua
 * lại giữa hai dạng nằm gọn ở đây để form chỉ lo phần hiển thị.
 */

import { parseNumber } from '@/core/parseNumber';
import type { PricingRule, PricingRuleKind } from '@/core/types';

export type RuleDirection = 'add' | 'subtract';
export type RuleTransport = 'both' | 'pickup' | 'bring';

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
}

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
  };
};

export const toRule = (draft: RuleDraft): Omit<PricingRule, 'id'> => {
  const sign = draft.direction === 'subtract' ? -1 : 1;
  const fixed = parseNumber(draft.fixedAmount);
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
