/**
 * Nhãn và cách viết chỉ tiêu chất lượng (V19) — chữ thuần, dùng chung cho màn hình (`features/pricing/quality.ts`)
 * và ảnh phiếu (`export/receiptCapture.ts`, chỉ được import core / i18n).
 */

import type { QualityMetric, TransactionLine } from '@mambo/core/types';
import { L } from './labels';

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

/** Nhãn ô độ mủ: mủ tạp đo DRC, còn lại giữ nhãn cũ. */
export const qualityPercentLabel = (line: Pick<TransactionLine, 'rubberKind'>): string =>
  line.rubberKind === 'cuplump' ? L.qualityPercentDrc : L.qualityPercent;

export const decimalText = (n: number): string => String(n).replace('.', ',');

/** "520 g/l", "14,5%" — một kiểu cho biên nhận và ảnh phiếu. */
export const metricValueText = (metric: Exclude<QualityMetric, 'qualityPercent'>, value: number): string =>
  `${decimalText(value)}${METRIC_UNIT[metric] === '%' ? '%' : ` ${METRIC_UNIT[metric]}`}`;
