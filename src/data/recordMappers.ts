import type { DraftReceipt, Note, Payment, PricingRule, Product, Supplier, Transaction } from '@/core/types';
import { formulaFrom } from '@/core/normalizeTransaction';
import type { DraftRecord, NoteRecord, PartyRecord, PaymentRecord, PricingRuleRecord, ProductRecord, TransactionRecord } from '@mambo/contracts';
import { partyIdFromWire } from './wireMappers';

export const partyFromRecord = (rec: PartyRecord): Supplier => ({
  id: rec.id,
  name: rec.name,
  phone: rec.phone ?? undefined,
  location: rec.location ?? undefined,
  note: rec.note ?? undefined,
});

export const productFromRecord = (rec: ProductRecord): Product => ({
  id: rec.id,
  name: rec.name,
  unit: rec.unit,
  formulaType: formulaFrom(rec.formulaType),
  isSuggested: rec.isSuggested,
  isActive: rec.isActive,
  crop: rec.crop ?? undefined,
  lastPricePerUnit: rec.lastPricePerUnit ?? undefined,
  group: rec.group ?? undefined,
  qualityGrades: rec.qualityGrades.length ? rec.qualityGrades : undefined,
  trackInventory: rec.trackInventory ?? undefined,
});

export const paymentFromRecord = (rec: PaymentRecord): Payment => ({
  id: rec.id,
  date: rec.date,
  amount: rec.amount,
  note: rec.note ?? undefined,
});

export const transactionFromRecord = (
  rec: TransactionRecord,
  payments: Payment[] = [],
): Transaction => {
  const sortedPayments = payments.sort((a, b) => a.date.localeCompare(b.date));
  const amountPaid = sortedPayments.reduce((s, p) => s + p.amount, 0);

  return {
    id: rec.id,
    date: rec.date,
    kind: rec.kind,
    counterpartyId: partyIdFromWire(rec.counterpartyId, rec.kind),
    supplierId: rec.supplierId ?? partyIdFromWire(rec.counterpartyId, rec.kind),
    supplierName: rec.supplierName,
    lines: rec.lines as unknown as Transaction['lines'],
    creditTerms: (rec.creditTerms as unknown as Transaction['creditTerms']) ?? undefined,
    adjustments: (rec.adjustments as unknown as Transaction['adjustments']) ?? undefined,
    attachmentIds: rec.attachmentIds.length ? rec.attachmentIds : undefined,
    note: rec.note ?? undefined,
    payments: sortedPayments,
    amountPaid,
    syncState: 'synced',
  };
};

export const draftFromRecord = (rec: DraftRecord): DraftReceipt => ({
  id: rec.id,
  status: rec.status,
  kind: rec.kind ?? undefined,
  counterpartyId: rec.counterpartyId ?? undefined,
  supplierId: rec.supplierId ?? undefined,
  supplierName: rec.supplierName,
  lines: rec.lines as unknown as DraftReceipt['lines'],
  amountPaid: rec.amountPaid,
  note: rec.note ?? undefined,
  attachmentIds: rec.attachmentIds.length ? rec.attachmentIds : undefined,
  createdAt: rec.createdAt,
  updatedAt: rec.updatedAt,
});

export const pricingRuleFromRecord = (rec: PricingRuleRecord): PricingRule => ({
  id: rec.id,
  name: rec.name,
  kind: rec.kind,
  productId: rec.productId ?? undefined,
  fixedAmount: rec.fixedAmount ?? undefined,
  percentOfTotal: rec.percentOfTotal ?? undefined,
  minWeightKg: rec.minWeightKg ?? undefined,
  appliesOnPickup: rec.appliesOnPickup ?? undefined,
  active: rec.active,
});

export const noteFromRecord = (rec: NoteRecord): Note => ({
  id: rec.id,
  body: rec.body,
  pinned: rec.pinned,
  done: rec.done,
  createdAt: rec.createdAt,
  updatedAt: rec.updatedAt,
});
