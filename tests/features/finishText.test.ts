/**
 * Câu báo sau khi chốt phiếu, và câu hướng dẫn bước 1 — chạy thử 19/10: "Ghi nợ & xong" phiếu 5 triệu báo
 * "Tổng phiếu: 0đ" (in số đã trả dưới nhãn tổng); phiếu bán vẫn dặn "chọn người bán".
 */

import { describe, expect, it } from 'vitest';
import type { Transaction } from '@mambo/core/types';
import { finishMessage } from '@/features/receipt/finishText';
import { coachSteps } from '@/features/onboarding/coachSteps';
import { L } from '@/i18n/labels';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  date: '2026-10-19T03:00:00.000Z',
  supplierId: 's-1',
  supplierName: 'Anh Tư',
  lines: [{ id: 'l-1', productName: 'Cà phê', unit: 'kg', formulaType: 'standard', grossWeight: 100, pricePerUnit: 50_000 }],
  amountPaid: 0,
  kind: 'purchase',
  counterpartyId: 's-1',
  payments: [],
  ...over,
});

describe('finishMessage', () => {
  it('ghi nợ: nói tổng phiếu thật và số còn nợ', () => {
    const text = finishMessage(tx({}));
    expect(text).toMatch(/^Tổng phiếu: 5\.000\.000/);
    expect(text).toContain(`${L.remainingDebt} 5.000.000`);
    expect(text).toContain('Anh Tư');
  });

  it('trả đủ: không nói nợ', () => {
    const text = finishMessage(tx({ amountPaid: 5_000_000 }));
    expect(text).toMatch(/^Tổng phiếu: 5\.000\.000/);
    expect(text).not.toContain(L.remainingDebt);
  });

  it('phiếu bán còn thiếu: nói "còn phải thu"', () => {
    expect(finishMessage(tx({ kind: 'sale', amountPaid: 1_000_000 }))).toContain(`${L.remainingReceivable} 4.000.000`);
  });
});

describe('coachSteps', () => {
  it('phiếu bán dặn chọn người mua', () => {
    expect(coachSteps('purchase')[0]).toBe(L.coachStep1);
    expect(coachSteps('sale')[0]).toBe(L.coachStep1Sale);
    expect(coachSteps('sale')).toHaveLength(4);
  });
});
