/**
 * Dòng hàng khi đang gõ.
 *
 * Giữ nguyên CHUỖI người dùng nhập, không đổi sang số ngay: gõ "1," rồi mới gõ
 * "5" mà đã parse thành số thì con trỏ nhảy và dấu phẩy biến mất. Chỉ đổi sang
 * số ở đúng một chỗ — `toLine()`.
 */

import { RECEIPT_LIMITS } from '@mambo/contracts';
import { lossFromGreenRatio } from '@mambo/core/calc';
import { newId } from '@mambo/core/id';
import { parseNumber } from '@mambo/core/parseNumber';
import type { CropType, Product, ProductFormulaType, RubberKind, TransactionLine } from '@mambo/core/types';
import { usableLine } from '@/data/receiptRules';

export interface LineDraft {
  readonly id: string;
  readonly productId?: string;
  readonly productName: string;
  readonly unit: string;
  readonly formulaType: ProductFormulaType;
  readonly crop?: CropType;
  readonly gross: string;
  readonly tare: string;
  readonly quality: string;
  readonly loss: string;
  readonly price: string;
  readonly qualityGrade?: string;
  readonly rubberKind?: RubberKind;
  /** Chỉ tiêu chất lượng (V19) — rỗng là không đo, khác với đo được 0. */
  readonly density: string;
  readonly moisture: string;
  readonly impurity: string;
  readonly kor: string;
  /** (V24) Cà phê tươi: bao nhiêu kg tươi ra 1 kg nhân. Có thì hao hụt suy từ tỷ lệ, không gõ tay. */
  readonly greenRatio: string;
}

export const emptyLine = (): LineDraft => ({
  id: newId(),
  productName: '',
  unit: 'kg',
  formulaType: 'netAfterTare',
  gross: '',
  tare: '',
  quality: '',
  loss: '',
  price: '',
  density: '',
  moisture: '',
  impurity: '',
  kor: '',
  greenRatio: '',
});

/** Chọn mặt hàng thì cách tính và đơn giá lần trước tự điền theo. */
export const applyProduct = (line: LineDraft, product: Product): LineDraft => ({
  ...line,
  productId: product.id,
  productName: product.name,
  unit: product.unit,
  formulaType: product.formulaType,
  crop: product.crop,
  rubberKind: product.rubberKind,
  greenRatio: product.formulaType === 'lossPercent' && product.greenRatio ? numberText(product.greenRatio) : '',
  price: line.price || (product.lastPricePerUnit ? String(product.lastPricePerUnit) : ''),
});

/**
 * Kẹp vào khoảng máy chủ nhận. Ô nhập đã chặn gõ vượt; đây là cho nháp lưu từ bản cũ (trước khi chặn)
 * — để nguyên thì op nháp / phiếu bị từ chối và chặn cả hàng đợi.
 */
const within = (raw: string, max: number): number => Math.min(Math.max(parseNumber(raw), 0), max);
const measured = (raw: string, max: number): number | undefined => (raw.trim() === '' ? undefined : within(raw, max));

/** Tỷ lệ tươi / nhân dùng được: lớn hơn 1, không quá giới hạn máy chủ. Khác thì như không có. */
export const greenRatioOf = (draft: Pick<LineDraft, 'formulaType' | 'greenRatio'>): number | undefined => {
  if (draft.formulaType !== 'lossPercent' || draft.greenRatio.trim() === '') return undefined;
  const ratio = parseNumber(draft.greenRatio);
  return ratio > 1 && ratio <= RECEIPT_LIMITS.greenRatio ? ratio : undefined;
};

export const toLine = (draft: LineDraft): TransactionLine => {
  const ratio = greenRatioOf(draft);
  return {
  id: draft.id,
  productId: draft.productId,
  productName: draft.productName.trim() || 'Mặt hàng',
  unit: draft.unit,
  formulaType: draft.formulaType,
  crop: draft.crop,
  grossWeight: within(draft.gross, RECEIPT_LIMITS.quantity),
  tareWeight: within(draft.tare, RECEIPT_LIMITS.quantity),
  qualityPercent: draft.formulaType === 'rubberLatex' ? within(draft.quality, RECEIPT_LIMITS.percent) : undefined,
  lossPercent:
    draft.formulaType !== 'lossPercent'
      ? undefined
      : ratio !== undefined
        ? lossFromGreenRatio(ratio)
        : within(draft.loss, RECEIPT_LIMITS.percent),
  greenRatio: ratio,
  pricePerUnit: within(draft.price, RECEIPT_LIMITS.quantity),
  qualityGrade: draft.qualityGrade,
  rubberKind: draft.formulaType === 'rubberLatex' ? draft.rubberKind : undefined,
  bulkDensity: measured(draft.density, RECEIPT_LIMITS.quantity),
  moisturePercent: measured(draft.moisture, RECEIPT_LIMITS.percent),
  impurityPercent: measured(draft.impurity, RECEIPT_LIMITS.percent),
  kor: measured(draft.kor, RECEIPT_LIMITS.quantity),
  };
};

const numberText = (value?: number): string =>
  value === undefined || value === 0 ? '' : String(value).replace('.', ',');

export const fromLine = (line: TransactionLine): LineDraft => ({
  id: line.id,
  productId: line.productId,
  productName: line.productName,
  unit: line.unit,
  formulaType: line.formulaType,
  crop: line.crop,
  gross: numberText(line.grossWeight),
  tare: numberText(line.tareWeight),
  quality: numberText(line.qualityPercent),
  loss: numberText(line.lossPercent),
  price: numberText(line.pricePerUnit),
  qualityGrade: line.qualityGrade,
  rubberKind: line.rubberKind,
  density: numberText(line.bulkDensity),
  moisture: numberText(line.moisturePercent),
  impurity: numberText(line.impurityPercent),
  kor: numberText(line.kor),
  greenRatio: numberText(line.greenRatio),
});

/** Dòng đã đủ thông tin để tính ra tiền. */
export const isUsable = (draft: LineDraft): boolean => usableLine(toLine(draft));
