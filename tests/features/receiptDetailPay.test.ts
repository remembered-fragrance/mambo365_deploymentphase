// @vitest-environment jsdom
/**
 * Phiếu còn nợ trả được ngay trên chi tiết phiếu — trước đây phải sang Công nợ tìm lại đúng người. Phiếu mua là
 * "trả", phiếu bán là "thu"; người không có quyền ghi tiền (`payment:record`) không thấy nút.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Permission } from '@mambo/contracts';
import { emptyData } from '@mambo/core/normalize';
import type { Transaction } from '@mambo/core/types';
import { ToastProvider } from '@/components/ui/Toast';
import { StoreContext, type StoreValue } from '@/data/useStore';
import { ReceiptDetailPage } from '@/features/receiptDetail/ReceiptDetailPage';
import { L } from '@/i18n/labels';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TX_ID = 'aaaaaaaa-1111-4111-8111-111111111111';

const tx = (kind: Transaction['kind'], amountPaid: number): Transaction => ({
  id: TX_ID,
  date: '2026-10-25T03:00:00.000Z',
  kind,
  counterpartyId: 'bbbbbbbb-1111-4111-8111-111111111111',
  supplierId: 'bbbbbbbb-1111-4111-8111-111111111111',
  supplierName: 'Chú Bảy',
  lines: [
    {
      id: 'cccccccc-1111-4111-8111-111111111111',
      productName: 'Cà phê',
      unit: 'kg',
      formulaType: 'standard',
      grossWeight: 100,
      pricePerUnit: 10_000,
      rawTotal: 1_000_000,
      roundedTotal: 1_000_000,
    },
  ],
  payments: [],
  amountPaid,
});

let root: Root;
let host: HTMLDivElement;
let recordPayment: ReturnType<typeof vi.fn>;

/** `orgType: null` = sổ của máy này: không chặn quyền nào. Có tổ chức thì chỉ có đúng `permissions`. */
const render = (receipt: Transaction, permissions: readonly Permission[] | null = null) => {
  recordPayment = vi.fn(() => ({ id: 'p1', amount: 1, date: receipt.date }));
  const store = {
    data: { ...emptyData(), transactions: [receipt] },
    user: null,
    orgType: permissions ? 'trader' : null,
    permissions: permissions ?? [],
    recordPayment,
    removePayment: vi.fn(),
    deleteTransaction: vi.fn(),
  } as unknown as StoreValue;
  act(() =>
    root.render(
      createElement(ToastProvider, null,
        createElement(StoreContext.Provider, { value: store },
          createElement(MemoryRouter, { initialEntries: [`/phieu/${TX_ID}`] },
            createElement(Routes, null, createElement(Route, { path: '/phieu/:id', element: createElement(ReceiptDetailPage) }))))),
    ),
  );
};

const button = (label: string): HTMLButtonElement | undefined =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('chi tiết phiếu — trả nợ tại chỗ', () => {
  it('🔴 phiếu mua còn nợ: "Trả đủ" ghi đúng số còn nợ vào đúng phiếu', () => {
    render(tx('purchase', 400_000));
    act(() => button(L.payFull)?.click());
    expect(recordPayment).toHaveBeenCalledWith(TX_ID, 600_000);
  });

  it('phiếu bán còn nợ: nút là "Thu đủ"', () => {
    render(tx('sale', 0));
    expect(button(L.collectFull)).toBeDefined();
    expect(button(L.payFull)).toBeUndefined();
  });

  it('phiếu đã trả đủ: không có nút trả', () => {
    render(tx('purchase', 1_000_000));
    expect(button(L.payFull)).toBeUndefined();
    expect(button(L.payPart)).toBeUndefined();
  });

  it('🔴 không có quyền ghi tiền: không thấy nút', () => {
    render(tx('purchase', 0), ['receipt:create']);
    expect(button(L.payFull)).toBeUndefined();
  });
});
