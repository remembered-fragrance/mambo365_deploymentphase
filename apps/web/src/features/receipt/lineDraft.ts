/**
 * Dòng hàng khi đang gõ.
 *
 * Giữ nguyên CHUỖI người dùng nhập, không đổi sang số ngay: gõ "1," rồi mới gõ
 * "5" mà đã parse thành số thì con trỏ nhảy và dấu phẩy biến mất. Chỉ đổi sang
 * số ở đúng một chỗ — `toLine()`.
 */

import { newId } from '@/core/id';
import { parseNumber } from '@/core/parseNumber';
import type { CropType, Product, ProductFormulaType, TransactionLine } from '@/core/types';

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
});

/** Chọn mặt hàng thì cách tính và đơn giá lần trước tự điền theo. */
export const applyProduct = (line: LineDraft, product: Product): LineDraft => ({
  ...line,
  productId: product.id,
  productName: product.name,
  unit: product.unit,
  formulaType: product.formulaType,
  crop: product.crop,
  price: line.price || (product.lastPricePerUnit ? String(product.lastPricePerUnit) : ''),
});

export const toLine = (draft: LineDraft): TransactionLine => ({
  id: draft.id,
  productId: draft.productId,
  productName: draft.productName.trim() || 'Mặt hàng',
  unit: draft.unit,
  formulaType: draft.formulaType,
  crop: draft.crop,
  grossWeight: parseNumber(draft.gross),
  tareWeight: parseNumber(draft.tare),
  qualityPercent: draft.formulaType === 'rubberLatex' ? parseNumber(draft.quality) : undefined,
  lossPercent: draft.formulaType === 'lossPercent' ? parseNumber(draft.loss) : undefined,
  pricePerUnit: parseNumber(draft.price),
  qualityGrade: draft.qualityGrade,
});

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
});

/** Dòng đã đủ thông tin để tính ra tiền. */
export const isUsable = (draft: LineDraft): boolean => {
  const line = toLine(draft);
  if (line.grossWeight <= 0 || line.pricePerUnit <= 0) return false;
  if (line.formulaType === 'rubberLatex') return (line.qualityPercent ?? 0) > 0;
  return true;
};
