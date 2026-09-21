import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type FormulaType = 'standard' | 'netAfterTare' | 'rubberLatex' | 'lossPercent';

export interface FormulaInput {
  readonly formulaType: FormulaType;
  readonly grossWeight: string;
  readonly tareWeight?: string | null;
  readonly qualityPercent?: string | null;
  readonly lossPercent?: string | null;
}

const d = (n: string | number | Decimal | null | undefined): Decimal => {
  if (n === null || n === undefined || n === '') return new Decimal(0);
  return new Decimal(n);
};

const clamp0 = (n: Decimal): Decimal => (n.isNegative() ? new Decimal(0) : n);

/** Khối lượng tính tiền — không dùng cho tồn kho. */
export const lineNetWeight = (input: FormulaInput): Decimal => {
  const gross = d(input.grossWeight);
  if (input.formulaType === 'rubberLatex') {
    return clamp0(gross.mul(d(input.qualityPercent)).div(100)).toDecimalPlaces(2);
  }
  if (input.formulaType === 'lossPercent') {
    return clamp0(gross.mul(new Decimal(1).minus(d(input.lossPercent).div(100)))).toDecimalPlaces(2);
  }
  if (input.formulaType === 'netAfterTare') {
    return clamp0(gross.minus(d(input.tareWeight))).toDecimalPlaces(2);
  }
  return clamp0(gross).toDecimalPlaces(2);
};

/** Khối lượng vật lý (tồn kho) = gross, không quy đổi. */
export const linePhysicalWeight = (input: Pick<FormulaInput, 'grossWeight'>): Decimal =>
  clamp0(d(input.grossWeight)).toDecimalPlaces(2);

export const roundToThousand = (n: Decimal): Decimal =>
  n.div(1000).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(1000);

export const lineMoney = (
  input: FormulaInput & { unitPrice: string },
): { netWeight: Decimal; rawTotal: Decimal; total: Decimal } => {
  const netWeight = lineNetWeight(input);
  const rawTotal = netWeight.mul(d(input.unitPrice)).toDecimalPlaces(0);
  return { netWeight, rawTotal, total: roundToThousand(rawTotal) };
};

export const qtyString = (n: Decimal): string => n.toFixed(3);
export const kgString = (n: Decimal): string => n.toFixed(2);
export const vndString = (n: Decimal): string => n.toDecimalPlaces(0).toFixed(0);
export const priceString = (n: Decimal): string => n.toFixed(2);

export const parseNonNeg = (raw: string, field: string): Decimal => {
  let n: Decimal;
  try {
    n = new Decimal(raw);
  } catch {
    throw Object.assign(new Error(field), { field });
  }
  if (!n.isFinite() || n.isNegative()) {
    throw Object.assign(new Error(field), { field });
  }
  return n;
};
