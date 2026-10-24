/**
 * Khoản cộng / trừ theo Quy tắc giá trên một phiếu chưa chốt — dùng chung cho màn lập phiếu, thanh "Đang cân" và
 * tab "Để dành", để ba chỗ ra cùng một Tổng phiếu.
 *
 * Quy tắc không hỏi cách giao hàng thì tự áp. Quy tắc chỉ cho "xe đến lấy" hay "tự mang tới" thì phiếu không biết
 * hàng đến bằng cách nào, nên chỉ mời thêm: bấm là thành một khoản cộng / trừ thêm (lưu trong nháp, gỡ được).
 * Quy tắc đã nằm trong khoản cộng / trừ thêm thì thôi tự áp, kẻo tính hai lần.
 */

import { useMemo } from 'react';
import { computeReceiptTotal, totalAdjustments } from '@mambo/core/calc';
import { suggestAdjustments } from '@mambo/core/pricing';
import type { DraftReceipt, PriceAdjustment, PricingRule, TransactionLine } from '@mambo/core/types';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { useStore } from '@/data/useStore';
import { fromLine, isUsable } from './lineDraft';

/** Quy tắc phiếu đọc tới: đang bật. Quy tắc theo chất lượng cần gói (V19) — hết gói vẫn giữ, chỉ thôi tự áp. */
export const receiptRules = (rules: readonly PricingRule[], paidQuality: boolean): PricingRule[] =>
  rules.filter((r) => r.active && (paidQuality || !r.qualityMetric));

export const useReceiptRules = (): readonly PricingRule[] => {
  const { data } = useStore();
  const paidQuality = useEntitlement('quality:pricing');
  return useMemo(() => receiptRules(data.pricingRules ?? [], paidQuality), [data.pricingRules, paidQuality]);
};

export interface RuleOffer {
  readonly adjustment: PriceAdjustment;
  /** `true`: chỉ khi xe đến lấy; `false`: chỉ khi khách tự mang tới. */
  readonly pickup: boolean;
}

export interface RuleAdjustments {
  readonly applied: PriceAdjustment[];
  readonly offered: RuleOffer[];
}

/** `lines`: chỉ dòng đã đủ số. `manual`: khoản cộng / trừ thêm đang có trên phiếu. */
export const adjustmentsFromRules = (
  rules: readonly PricingRule[],
  lines: readonly TransactionLine[],
  manual: readonly PriceAdjustment[],
): RuleAdjustments => {
  // Chưa cân dòng nào thì chưa có gì để cộng trừ — phí cố định không hiện lên phiếu trắng.
  if (lines.length === 0) return { applied: [], offered: [] };
  const fresh = rules.filter((r) => !manual.some((a) => a.ruleId === r.id));
  const { netWeight, total } = computeReceiptTotal(lines);
  const ctx = { lines, totalKg: netWeight, totalAmount: total };
  const offer = (pickup: boolean): RuleOffer[] =>
    suggestAdjustments(
      fresh.filter((r) => r.appliesOnPickup === pickup),
      { ...ctx, isPickup: pickup },
    ).map((adjustment) => ({ adjustment, pickup }));

  return {
    applied: suggestAdjustments(
      fresh.filter((r) => r.appliesOnPickup === null || r.appliesOnPickup === undefined),
      ctx,
    ),
    offered: [...offer(true), ...offer(false)],
  };
};

/** Tổng phiếu của một nháp — đúng số màn lập phiếu ghi ở "Tổng phiếu" khi mở nháp đó ra. */
export const draftTotal = (draft: DraftReceipt, rules: readonly PricingRule[]): number => {
  const lines = draft.lines.filter((l) => isUsable(fromLine(l)));
  const manual = draft.adjustments ?? [];
  const { applied } = adjustmentsFromRules(rules, lines, manual);
  return computeReceiptTotal(lines).total + totalAdjustments([...manual, ...applied]);
};
