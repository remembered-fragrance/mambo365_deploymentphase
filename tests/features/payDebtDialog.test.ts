// @vitest-environment jsdom
/**
 * Hộp "Trả một phần" luôn được gắn sẵn trên trang, chỉ ẩn khi chưa chọn phiếu. Số đã gõ mà còn lại sau khi đóng thì
 * lần mở sau — có khi cho phiếu của NGƯỜI KHÁC ở màn Công nợ — ô tiền đã điền sẵn số cũ, bấm Đồng ý là ghi sai tiền.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '@mambo/core/types';
import { PayDebtDialog } from '@/features/debts/PayDebtDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const tx = (id: string, supplierName: string): Transaction => ({
  id,
  date: '2026-10-25T03:00:00.000Z',
  kind: 'purchase',
  counterpartyId: 'bbbbbbbb-1111-4111-8111-111111111111',
  supplierId: 'bbbbbbbb-1111-4111-8111-111111111111',
  supplierName,
  lines: [
    {
      id: `${id.slice(0, 8)}-1111-4111-8111-111111111111`,
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
  amountPaid: 0,
});

const A = tx('aaaaaaaa-1111-4111-8111-111111111111', 'Cô Mai');
const B = tx('cccccccc-1111-4111-8111-111111111111', 'Chú Bảy');

let root: Root;
let host: HTMLDivElement;

const show = (target: Transaction | null) =>
  act(() =>
    root.render(createElement(PayDebtDialog, { tx: target, side: 'payable', onConfirm: () => undefined, onCancel: () => undefined })),
  );

const amountInput = (): HTMLInputElement | null => document.querySelector('[role=dialog] input');

const type = (text: string) => {
  const input = amountInput();
  if (!input) throw new Error('không thấy ô tiền');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text);
  act(() => {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('Trả một phần', () => {
  it('gõ số thì ô tiền nhận số', () => {
    show(A);
    type('500000');
    expect(amountInput()?.value).toBe('500.000');
  });

  it('🔴 gõ dở rồi đóng, mở cho phiếu khác ⇒ ô tiền trống', () => {
    show(A);
    type('500000');
    show(null);
    show(B);
    expect(amountInput()?.value).toBe('');
  });

  it('🔴 gõ dở rồi đóng, mở lại đúng phiếu đó ⇒ ô tiền trống', () => {
    show(A);
    type('500000');
    show(null);
    show(A);
    expect(amountInput()?.value).toBe('');
  });
});
