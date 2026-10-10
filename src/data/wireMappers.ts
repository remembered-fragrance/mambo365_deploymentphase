import type { Buyer, DraftReceipt, Note, Payment, PricingRule, Product, Supplier, Transaction } from '@/core/types';
import { GUEST_BUYER_ID, GUEST_SUPPLIER_ID } from '@/core/normalizeTransaction';
import { freezeLineTotals } from '@/core/calc';

export const partyIdToWire = (id: string | null | undefined): string | null =>
  !id || id === GUEST_SUPPLIER_ID || id === GUEST_BUYER_ID ? null : id;

export const partyIdFromWire = (id: string | null | undefined, kind: string): string =>
  id ?? (kind === 'sale' ? GUEST_BUYER_ID : GUEST_SUPPLIER_ID);

export const partyToInsert = (party: Supplier | Buyer) => ({
  name: party.name.trim(),
  phone: party.phone?.trim() || null,
  location: party.location?.trim() || null,
  note: party.note?.trim() || null,
});

export const partyToPatch = (patch: Partial<Supplier | Buyer>) => {
  const result: Record<string, unknown> = {};
  if (patch.name !== undefined) result.name = patch.name.trim();
  if (patch.phone !== undefined) result.phone = patch.phone ? patch.phone.trim() : null;
  if (patch.location !== undefined) result.location = patch.location ? patch.location.trim() : null;
  if (patch.note !== undefined) result.note = patch.note ? patch.note.trim() : null;
  return result;
};

export const productToInsert = (product: Product) => ({
  name: product.name.trim(),
  unit: product.unit.trim() || 'kg',
  formulaType: product.formulaType,
  isSuggested: Boolean(product.isSuggested),
  isActive: product.isActive !== false,
  crop: product.crop ?? null,
  lastPricePerUnit: product.lastPricePerUnit ?? null,
  group: product.group?.trim() || null,
  qualityGrades: product.qualityGrades ? [...product.qualityGrades] : [],
  trackInventory: product.trackInventory ?? null,
});

export const productToPatch = (patch: Partial<Product>) => {
  const result: Record<string, unknown> = {};
  if (patch.name !== undefined) result.name = patch.name.trim();
  if (patch.unit !== undefined) result.unit = patch.unit.trim();
  if (patch.formulaType !== undefined) result.formulaType = patch.formulaType;
  if (patch.isSuggested !== undefined) result.isSuggested = patch.isSuggested;
  if (patch.isActive !== undefined) result.isActive = patch.isActive;
  if (patch.crop !== undefined) result.crop = patch.crop ?? null;
  if (patch.lastPricePerUnit !== undefined) result.lastPricePerUnit = patch.lastPricePerUnit ?? null;
  if (patch.group !== undefined) result.group = patch.group ? patch.group.trim() : null;
  if (patch.qualityGrades !== undefined) result.qualityGrades = patch.qualityGrades ? [...patch.qualityGrades] : [];
  if (patch.trackInventory !== undefined) result.trackInventory = patch.trackInventory ?? null;
  return result;
};

export const paymentToInsert = (payment: Payment, transactionId: string) => ({
  transactionId,
  date: payment.date,
  amount: payment.amount,
  note: payment.note?.trim() || null,
});

export const transactionToInsert = (tx: Transaction) => ({
  date: tx.date,
  kind: tx.kind,
  counterpartyId: partyIdToWire(tx.counterpartyId),
  supplierId:
    tx.supplierId && tx.supplierId !== GUEST_SUPPLIER_ID && tx.supplierId !== GUEST_BUYER_ID
      ? tx.supplierId
      : null,
  supplierName: tx.supplierName.trim() || 'Khách lẻ',
  lines: tx.lines.map((l) => {
    const frozen = freezeLineTotals(l);
    return {
      id: frozen.id,
      ...(frozen.crop ? { crop: frozen.crop } : {}),
      ...(frozen.productId ? { productId: frozen.productId } : {}),
      productName: frozen.productName,
      unit: frozen.unit,
      formulaType: frozen.formulaType,
      grossWeight: frozen.grossWeight,
      ...(frozen.tareWeight !== undefined ? { tareWeight: frozen.tareWeight } : {}),
      ...(frozen.qualityPercent !== undefined ? { qualityPercent: frozen.qualityPercent } : {}),
      ...(frozen.lossPercent !== undefined ? { lossPercent: frozen.lossPercent } : {}),
      pricePerUnit: frozen.pricePerUnit,
      rawTotal: frozen.rawTotal ?? 0,
      roundedTotal: frozen.roundedTotal ?? 0,
      ...(frozen.qualityGrade ? { qualityGrade: frozen.qualityGrade } : {}),
    };
  }),
  creditTerms: tx.creditTerms
    ? tx.creditTerms.map((ct) => ({ dueDate: ct.dueDate, amount: ct.amount }))
    : null,
  adjustments: tx.adjustments
    ? tx.adjustments.map((a) => ({
        id: a.id,
        kind: a.kind,
        label: a.label,
        amount: a.amount,
        ruleId: a.ruleId,
      }))
    : null,
  attachmentIds: tx.attachmentIds ? [...tx.attachmentIds] : [],
  note: tx.note?.trim() || null,
});

export const transactionToPatch = (patch: { attachmentIds?: string[]; note?: string }) => {
  const result: Record<string, unknown> = {};
  if (patch.attachmentIds !== undefined) result.attachmentIds = [...patch.attachmentIds];
  if (patch.note !== undefined) result.note = patch.note.trim() || null;
  return result;
};

export const draftToInsert = (draft: DraftReceipt) => ({
  status: draft.status,
  kind: draft.kind ?? null,
  counterpartyId: partyIdToWire(draft.counterpartyId),
  supplierId:
    draft.supplierId &&
    draft.supplierId !== GUEST_SUPPLIER_ID &&
    draft.supplierId !== GUEST_BUYER_ID
      ? draft.supplierId
      : null,
  supplierName: draft.supplierName.trim() || 'Khách lẻ',
  lines: draft.lines.map((l) => ({
    id: l.id,
    ...(l.crop ? { crop: l.crop } : {}),
    ...(l.productId ? { productId: l.productId } : {}),
    productName: l.productName,
    unit: l.unit,
    formulaType: l.formulaType,
    grossWeight: l.grossWeight,
    ...(l.tareWeight !== undefined ? { tareWeight: l.tareWeight } : {}),
    ...(l.qualityPercent !== undefined ? { qualityPercent: l.qualityPercent } : {}),
    ...(l.lossPercent !== undefined ? { lossPercent: l.lossPercent } : {}),
    pricePerUnit: l.pricePerUnit,
    rawTotal: l.rawTotal,
    roundedTotal: l.roundedTotal,
    ...(l.qualityGrade ? { qualityGrade: l.qualityGrade } : {}),
  })),
  amountPaid: draft.amountPaid ?? 0,
  note: draft.note?.trim() || null,
  attachmentIds: draft.attachmentIds ? [...draft.attachmentIds] : [],
});

export const draftToPatch = (patch: Partial<DraftReceipt>) => {
  const result: Record<string, unknown> = {};
  if (patch.status !== undefined) result.status = patch.status;
  if (patch.kind !== undefined) result.kind = patch.kind ?? null;
  if (patch.counterpartyId !== undefined)
    result.counterpartyId = partyIdToWire(patch.counterpartyId);
  if (patch.supplierName !== undefined) result.supplierName = patch.supplierName.trim();
  if (patch.lines !== undefined) result.lines = patch.lines;
  if (patch.amountPaid !== undefined) result.amountPaid = patch.amountPaid;
  if (patch.note !== undefined) result.note = patch.note ? patch.note.trim() : null;
  if (patch.attachmentIds !== undefined)
    result.attachmentIds = patch.attachmentIds ? [...patch.attachmentIds] : [];
  return result;
};

export const pricingRuleToInsert = (rule: PricingRule) => ({
  name: rule.name.trim(),
  kind: rule.kind,
  productId: rule.productId ?? null,
  fixedAmount: rule.fixedAmount ?? null,
  percentOfTotal: rule.percentOfTotal ?? null,
  minWeightKg: rule.minWeightKg ?? null,
  appliesOnPickup: rule.appliesOnPickup ?? null,
  active: rule.active,
});

export const pricingRuleToPatch = (patch: Partial<PricingRule>) => {
  const result: Record<string, unknown> = {};
  if (patch.name !== undefined) result.name = patch.name.trim();
  if (patch.kind !== undefined) result.kind = patch.kind;
  if (patch.productId !== undefined) result.productId = patch.productId ?? null;
  if (patch.fixedAmount !== undefined) result.fixedAmount = patch.fixedAmount ?? null;
  if (patch.percentOfTotal !== undefined) result.percentOfTotal = patch.percentOfTotal ?? null;
  if (patch.minWeightKg !== undefined) result.minWeightKg = patch.minWeightKg ?? null;
  if (patch.appliesOnPickup !== undefined) result.appliesOnPickup = patch.appliesOnPickup ?? null;
  if (patch.active !== undefined) result.active = patch.active;
  return result;
};

export const noteToInsert = (note: Note) => ({
  body: note.body.trim(),
  pinned: Boolean(note.pinned),
  done: Boolean(note.done),
});

export const noteToPatch = (patch: Partial<Note>) => {
  const result: Record<string, unknown> = {};
  if (patch.body !== undefined) result.body = patch.body.trim();
  if (patch.pinned !== undefined) result.pinned = patch.pinned;
  if (patch.done !== undefined) result.done = patch.done;
  return result;
};
