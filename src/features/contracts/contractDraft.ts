/**
 * Hợp đồng mùa vụ khi đang gõ (V15) và câu tiến độ hiện sau khi chốt phiếu.
 * Ngày giữ dạng `yyyy-mm-dd` của ô ngày; lưu là đầu ngày theo giờ máy.
 */

import { formatQuantity } from '@mambo/core/format';
import { parseNumber } from '@mambo/core/parseNumber';
import { contractProgress, contractsForTransaction, type NewSeasonContract } from '@mambo/core/seasonContracts';
import type { AppData, SeasonContract, Transaction, TransactionKind } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { parseMoney } from '../shared/money';

export interface ContractDraft {
  readonly id?: string;
  readonly kind: TransactionKind;
  /** Rỗng = người ngoài sổ, gõ tên. */
  readonly partyId: string;
  readonly partyName: string;
  readonly productId: string;
  readonly quantity: string;
  readonly price: string;
  readonly start: string;
  readonly end: string;
  readonly note: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');
export const dayInput = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dayIso = (day: string): string => new Date(`${day}T00:00:00`).toISOString();
const numberText = (n?: number): string => (n === undefined ? '' : String(n).replace('.', ','));

export const emptyContract = (now = new Date()): ContractDraft => ({
  kind: 'purchase',
  partyId: '',
  partyName: '',
  productId: '',
  quantity: '',
  price: '',
  start: dayInput(now),
  end: dayInput(new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())),
  note: '',
});

export const draftFromContract = (c: SeasonContract): ContractDraft => ({
  id: c.id,
  kind: c.kind,
  partyId: c.counterpartyId ?? '',
  partyName: c.counterpartyName,
  productId: c.productId ?? '',
  quantity: numberText(c.quantity),
  price: numberText(c.pricePerUnit),
  start: dayInput(new Date(c.startDate)),
  end: dayInput(new Date(c.endDate)),
  note: c.note ?? '',
});

export type ContractProblem = 'party' | 'product' | 'quantity' | 'period';

/** Lỗi đầu tiên theo thứ tự ô trên form; `null` = lưu được. */
export const contractProblem = (d: ContractDraft): ContractProblem | null => {
  if (!d.partyId && d.partyName.trim() === '') return 'party';
  if (!d.productId) return 'product';
  if (!(parseNumber(d.quantity) > 0)) return 'quantity';
  if (!d.start || !d.end || d.end < d.start) return 'period';
  return null;
};

export const toContractInput = (d: ContractDraft, data: AppData): NewSeasonContract => {
  const parties = d.kind === 'sale' ? data.buyers : data.suppliers;
  const party = parties.find((p) => p.id === d.partyId);
  const product = data.products.find((p) => p.id === d.productId);
  const price = d.price.trim() === '' ? undefined : parseMoney(d.price);
  return {
    kind: d.kind,
    counterpartyId: party?.id,
    counterpartyName: party?.name ?? d.partyName.trim(),
    productId: product?.id,
    productName: product?.name ?? '',
    unit: product?.unit ?? 'kg',
    quantity: parseNumber(d.quantity),
    pricePerUnit: price && price > 0 ? price : undefined,
    startDate: dayIso(d.start),
    endDate: dayIso(d.end),
    note: d.note.trim() || undefined,
  };
};

/** "Hợp đồng Cô Mai: đã giao 5.000 kg / 10.000 kg, còn 5.000 kg" — rỗng khi phiếu không thuộc hợp đồng nào đang mở. */
export const contractNote = (data: AppData, tx: Transaction): string => {
  // Sổ trong lần vẽ này chưa có phiếu vừa chốt.
  const book = { ...data, transactions: [tx, ...data.transactions.filter((t) => t.id !== tx.id)] };
  const contract = contractsForTransaction(book, tx)[0];
  if (!contract) return '';
  const p = contractProgress(book, contract);
  const qty = (n: number) => formatQuantity(n, contract.unit);
  return `${L.contractToastPrefix} ${contract.counterpartyName}: ${L.contractDelivered.toLowerCase()} ${qty(p.delivered)} / ${qty(contract.quantity)}, ${L.contractRemaining} ${qty(p.remaining)}`;
};
