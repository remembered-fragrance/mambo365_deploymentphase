/**
 * Giá theo chất lượng (V19) — phần app dùng chung giữa Quy tắc giá, màn lập phiếu và biên nhận.
 * Cách tính nằm ở `@mambo/core/pricing` (`suggestAdjustments`, `qualityStepOf`); ở đây chỉ có nhãn và lọc.
 */

import type { PricingRule, QualityMetric, TransactionLine } from '@mambo/core/types';
import { L } from '@/i18n/labels';

export const METRIC_LABEL: Record<QualityMetric, string> = {
  bulkDensity: L.metricBulkDensity,
  moisturePercent: L.metricMoisture,
  impurityPercent: L.metricImpurity,
  kor: L.metricKor,
  qualityPercent: L.metricRubber,
};

export const METRIC_UNIT: Record<QualityMetric, string> = {
  bulkDensity: 'g/l',
  moisturePercent: '%',
  impurityPercent: '%',
  kor: 'lbs',
  qualityPercent: '%',
};

/** Quy tắc theo chỉ tiêu đang bật. */
export const qualityRules = (rules: readonly PricingRule[]): PricingRule[] =>
  rules.filter((r) => r.active && r.qualityMetric);

/**
 * Chỉ tiêu cần hỏi ở dòng của mặt hàng này: chỉ những gì có quy tắc đang bật đọc tới — vựa không khai bảng
 * mốc thì phiếu không thêm ô nào. Độ mủ đã có ô riêng của công thức cao su.
 */
export const metricsForProduct = (rules: readonly PricingRule[], productId: string | undefined): QualityMetric[] => [
  ...new Set(
    qualityRules(rules)
      .filter((r) => !r.productId || r.productId === productId)
      .map((r) => r.qualityMetric as QualityMetric)
      .filter((m) => m !== 'qualityPercent'),
  ),
];

/** Nhãn ô độ mủ: mủ tạp đo DRC, còn lại giữ nhãn cũ. */
export const qualityPercentLabel = (line: Pick<TransactionLine, 'rubberKind'>): string =>
  line.rubberKind === 'cuplump' ? L.qualityPercentDrc : L.qualityPercent;

const num = (n: number): string => String(n).replace('.', ',');

/** "Dung trọng 520 g/l · Độ ẩm 14%" — để biên nhận nói vì sao giá đổi. Rỗng nếu dòng không đo gì. */
export const qualityText = (line: TransactionLine): string => {
  const parts: string[] = [];
  if (line.formulaType === 'rubberLatex' && line.rubberKind === 'cuplump' && line.qualityPercent !== undefined) {
    parts.push(`${L.qualityPercentDrc} ${num(line.qualityPercent)}%`);
  }
  for (const metric of ['bulkDensity', 'moisturePercent', 'impurityPercent', 'kor'] as const) {
    const value = line[metric];
    if (value !== undefined) parts.push(`${METRIC_LABEL[metric]} ${num(value)}${METRIC_UNIT[metric] === '%' ? '%' : ` ${METRIC_UNIT[metric]}`}`);
  }
  return parts.join(' · ');
};
