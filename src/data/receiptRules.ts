/**
 * Khoản cộng / trừ theo Quy tắc giá trên một phiếu chưa chốt — dùng chung cho màn lập phiếu, thanh "Đang cân", tab
 * "Để dành" và thông báo thay đổi bị bỏ (`sync.ts`), để mọi chỗ ra cùng một Tổng phiếu.
 *
 * Quy tắc không hỏi cách giao hàng thì tự áp. Quy tắc chỉ cho "xe đến lấy" hay "tự mang tới" thì phiếu không biết
 * hàng đến bằng cách nào, nên chỉ mời thêm: bấm là nháp ghi lại lựa chọn đó (một khoản mang `ruleId`, gỡ được), còn số
 * tiền vẫn tính lại theo dòng mỗi lần gõ như khoản tự áp. Quy tắc đã nhận thì thôi tự áp / mời lại, kẻo tính hai lần.
 * Quy tắc giá là giá vựa trả khi mua vào — phiếu bán không áp.
 */

import { computeReceiptTotal, linePrice, totalAdjustments } from '@mambo/core/calc';
import { suggestAdjustments } from '@mambo/core/pricing';
import type { DraftReceipt, PriceAdjustment, PricingRule, TransactionKind, TransactionLine } from '@mambo/core/types';

/** Dòng đã đủ thông tin để tính ra tiền. */
export const usableLine = (line: TransactionLine): boolean => {
  if (line.grossWeight <= 0 || linePrice(line) <= 0) return false;
  if (line.formulaType === 'rubberLatex') return (line.qualityPercent ?? 0) > 0;
  return true;
};

/** Quy tắc phiếu đọc tới: đang bật. Quy tắc theo chất lượng cần gói (V19) — hết gói vẫn giữ, chỉ thôi tự áp. */
export const receiptRules = (rules: readonly PricingRule[], paidQuality: boolean): PricingRule[] =>
  rules.filter((r) => r.active && (paidQuality || !r.qualityMetric));

/** Phiếu bán không áp quy tắc giá. */
export const rulesForKind = (rules: readonly PricingRule[], kind: TransactionKind | undefined): readonly PricingRule[] =>
  kind === 'sale' ? [] : rules;

export interface RuleOffer {
  readonly adjustment: PriceAdjustment;
  /** `true`: chỉ khi xe đến lấy; `false`: chỉ khi khách tự mang tới. */
  readonly pickup: boolean;
}

export interface RuleAdjustments {
  /** Khoản gõ tay. */
  readonly typed: PriceAdjustment[];
  /** Khoản đã nhận từ lời mời, số tiền tính theo phiếu hiện tại — `0` là phiếu chưa đủ điều kiện của quy tắc. */
  readonly accepted: PriceAdjustment[];
  readonly applied: PriceAdjustment[];
  readonly offered: RuleOffer[];
}

/** `lines`: chỉ dòng đã đủ số. `manual`: khoản lưu trong nháp (gõ tay + đã nhận từ lời mời). */
export const adjustmentsFromRules = (
  rules: readonly PricingRule[],
  lines: readonly TransactionLine[],
  manual: readonly PriceAdjustment[],
): RuleAdjustments => {
  const { netWeight, total } = computeReceiptTotal(lines);
  const ctx = { lines, totalKg: netWeight, totalAmount: total };
  const typed = manual.filter((a) => !a.ruleId);
  const accepted = manual
    .filter((a) => a.ruleId)
    .map((a) => {
      const rule = rules.find((r) => r.id === a.ruleId);
      // Quy tắc đã tắt / xoá sau khi nhận: không còn gì để tính lại, giữ đúng số lúc nhận như khoản gõ tay.
      if (!rule) return a;
      const [hit] =
        lines.length === 0
          ? []
          : suggestAdjustments([rule], {
              ...ctx,
              ...(typeof rule.appliesOnPickup === 'boolean' ? { isPickup: rule.appliesOnPickup } : {}),
            });
      return { ...a, kind: rule.kind, label: rule.name, amount: hit?.amount ?? 0 };
    });

  // Chưa cân dòng nào thì chưa có gì để cộng trừ — phí cố định không hiện lên phiếu trắng.
  if (lines.length === 0) return { typed, accepted, applied: [], offered: [] };
  const fresh = rules.filter((r) => !manual.some((a) => a.ruleId === r.id));
  const offer = (pickup: boolean): RuleOffer[] =>
    suggestAdjustments(
      fresh.filter((r) => r.appliesOnPickup === pickup),
      { ...ctx, isPickup: pickup },
    ).map((adjustment) => ({ adjustment, pickup }));

  return {
    typed,
    accepted,
    applied: suggestAdjustments(
      fresh.filter((r) => r.appliesOnPickup === null || r.appliesOnPickup === undefined),
      ctx,
    ),
    offered: [...offer(true), ...offer(false)],
  };
};

/** Mọi khoản sẽ ghi lên phiếu lúc chốt. Khoản đã nhận mà phiếu chưa đủ điều kiện (0đ) thì không ghi. */
export const receiptAdjustments = (r: RuleAdjustments): PriceAdjustment[] =>
  [...r.typed, ...r.accepted, ...r.applied].filter((a) => a.amount !== 0);

/** Tổng phiếu của một nháp — đúng số màn lập phiếu ghi ở "Tổng phiếu" khi mở nháp đó ra. */
export const draftTotal = (draft: DraftReceipt, rules: readonly PricingRule[]): number => {
  const lines = draft.lines.filter(usableLine);
  const adjusted = adjustmentsFromRules(rulesForKind(rules, draft.kind), lines, draft.adjustments ?? []);
  return computeReceiptTotal(lines).total + totalAdjustments(receiptAdjustments(adjusted));
};
