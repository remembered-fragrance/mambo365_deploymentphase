// @vitest-environment jsdom
/**
 * Tổng quan ghi số tiền đủ — mentor 30/10: khối trên ghi 13.154.000đ mà ba ô dưới ghi 13,2tr, người xem tưởng
 * hai số khác nhau hoặc đọc 13,2tr thành 13.200.000. "Tiền làm tròn là nguy hiểm".
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyData } from '@mambo/core/normalize';
import type { Transaction } from '@mambo/core/types';
import { StoreContext, type StoreValue } from '@/data/useStore';
import { DashboardPage } from '@/features/dashboard/DashboardPage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const purchaseToday: Transaction = {
  id: 'aaaaaaaa-2222-4222-8222-222222222222',
  date: new Date().toISOString(),
  kind: 'purchase',
  counterpartyId: 'bbbbbbbb-2222-4222-8222-222222222222',
  supplierId: 'bbbbbbbb-2222-4222-8222-222222222222',
  supplierName: 'Chú Bảy',
  lines: [
    {
      id: 'cccccccc-2222-4222-8222-222222222222',
      productName: 'Cà phê',
      unit: 'kg',
      formulaType: 'standard',
      grossWeight: 1_318,
      pricePerUnit: 10_000,
      rawTotal: 13_180_000,
      roundedTotal: 13_180_000,
    },
  ],
  payments: [],
  amountPaid: 13_180_000,
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Tổng quan', () => {
  it('ghi số tiền đủ ở khối trên, ô KPI và biểu đồ — không làm tròn theo triệu', () => {
    // `currentOrgId: null` = sổ của máy này: không vẽ hai thẻ cần máy chủ (mã kết nối, nhân viên).
    const store = {
      data: { ...emptyData(), transactions: [purchaseToday] },
      currentOrgId: null,
      orgType: null,
      permissions: [],
    } as unknown as StoreValue;
    act(() =>
      root.render(
        createElement(StoreContext.Provider, { value: store },
          createElement(MemoryRouter, null, createElement(DashboardPage))),
      ),
    );

    const text = host.textContent ?? '';
    // Khối trên + 3 ô KPI (hôm nay, 7 ngày, 30 ngày) + nhãn cột cao nhất của biểu đồ.
    expect(text.split('13.180.000').length - 1).toBeGreaterThanOrEqual(5);
    expect(text).not.toContain('13,2tr');
    expect(text).not.toMatch(/\d,\d+tr/);
  });
});
