// @vitest-environment jsdom
/**
 * Tổng quan ghi số tiền đủ — mentor 30/10: khối trên ghi 13.154.000đ mà ba ô dưới ghi 13,2tr, người xem tưởng
 * hai số khác nhau hoặc đọc 13,2tr thành 13.200.000. "Tiền làm tròn là nguy hiểm".
 * Phần 2: bỏ ô "Hôm nay" trùng khối trên, công nợ ghi rõ chiều + tổng tiền, thao tác nhanh theo quyền.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Permission } from '@mambo/contracts';
import { formatVnd } from '@mambo/core/format';
import { emptyData } from '@mambo/core/normalize';
import type { Transaction } from '@mambo/core/types';
import { StoreContext, type StoreValue } from '@/data/useStore';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { L } from '@/i18n/labels';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const coffeeLine: Transaction['lines'][number] = {
  id: 'cccccccc-2222-4222-8222-222222222222',
  productName: 'Cà phê',
  unit: 'kg',
  formulaType: 'standard',
  grossWeight: 1_318,
  pricePerUnit: 10_000,
  rawTotal: 13_180_000,
  roundedTotal: 13_180_000,
};

const purchaseToday: Transaction = {
  id: 'aaaaaaaa-2222-4222-8222-222222222222',
  date: new Date().toISOString(),
  kind: 'purchase',
  counterpartyId: 'bbbbbbbb-2222-4222-8222-222222222222',
  supplierId: 'bbbbbbbb-2222-4222-8222-222222222222',
  supplierName: 'Chú Bảy',
  lines: [coffeeLine],
  payments: [],
  amountPaid: 13_180_000,
};

const saleToday: Transaction = {
  ...purchaseToday,
  id: 'dddddddd-2222-4222-8222-222222222222',
  kind: 'sale',
  lines: [{ ...coffeeLine, id: 'eeeeeeee-2222-4222-8222-222222222222', rawTotal: 4_500_000, roundedTotal: 4_500_000 }],
  amountPaid: 4_500_000,
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

interface RenderOptions {
  readonly transactions: readonly Transaction[];
  readonly orgType?: 'trader' | null;
  readonly permissions?: readonly Permission[];
}

// `currentOrgId: null` = sổ của máy này: không vẽ hai thẻ cần máy chủ (mã kết nối, nhân viên).
const render = ({ transactions, orgType = null, permissions = [] }: RenderOptions) => {
  const store = {
    data: { ...emptyData(), transactions },
    currentOrgId: null,
    orgType,
    permissions,
  } as unknown as StoreValue;
  act(() =>
    root.render(
      createElement(StoreContext.Provider, { value: store },
        createElement(MemoryRouter, null, createElement(DashboardPage))),
    ),
  );
  return host.textContent ?? '';
};

const hrefs = () => [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('Tổng quan', () => {
  it('ghi số tiền đủ ở khối trên, ô KPI và dòng "Cao nhất" — không làm tròn theo triệu', () => {
    const text = render({ transactions: [purchaseToday] });

    // Khối trên + 2 ô KPI (7 ngày, 30 ngày) + dòng "Cao nhất" dưới biểu đồ.
    expect(text.split('13.180.000').length - 1).toBeGreaterThanOrEqual(4);
    expect(text).not.toContain('13,2tr');
    expect(text).not.toMatch(/\d,\d+tr/);
  });

  it('không còn ô "Hôm nay" trùng khối trên', () => {
    render({ transactions: [purchaseToday] });
    expect(hrefs()).not.toContain('/phieu?period=day');
  });

  it('biểu đồ tô cột hôm nay, mỗi cột vẫn có số đủ trong aria-label', () => {
    const text = render({ transactions: [purchaseToday] });
    const bars = [...host.querySelectorAll('[role="img"]')];

    expect(bars).toHaveLength(7);
    expect(bars.at(-1)?.className).toMatch(/(^|\s)bg-brand(\s|$)/);
    expect(bars.at(-1)?.getAttribute('aria-label')).toContain(formatVnd(13_180_000));
    // Ngày không mua: vạch màu kẻ, không phải vạch xanh "có mua chút ít".
    expect(bars[0]?.className).toContain('bg-rule');
    expect(text).toContain(`${L.last7DaysPeak}:`);
  });

  it('việc cần làm ghi rõ mình còn nợ người bán + tổng tiền', () => {
    const text = render({ transactions: [{ ...purchaseToday, amountPaid: 0 }] });

    expect(text).toContain(L.todoDebts);
    expect(text).toContain(`${L.todoTotal} ${formatVnd(13_180_000)}`);
  });

  it('bán ra 30 ngày đứng cạnh chi mua 30 ngày, màu tím như phiếu bán', () => {
    render({ transactions: [purchaseToday, saleToday] });
    const tile = host.querySelector('a[href="/phieu?period=month&kind=sale"]');

    expect(tile?.textContent).toContain(L.salesBlock);
    expect(tile?.textContent).toContain(formatVnd(4_500_000));
    expect(tile?.querySelector('.text-out')).not.toBeNull();
  });

  it('thao tác nhanh: sổ của máy này thấy đủ 4 nút', () => {
    const text = render({ transactions: [purchaseToday] });

    expect(text).toContain(L.quickActionsTitle);
    expect(hrefs()).toEqual(expect.arrayContaining(['/tao-phieu?kind=purchase', '/tao-phieu?kind=sale', '/cong-no', '/bao-cao']));
  });

  it('thao tác nhanh: không có quyền tạo phiếu thì không vẽ; thiếu quyền màn nào thì bỏ nút đó', () => {
    let text = render({ transactions: [purchaseToday], orgType: 'trader', permissions: ['report:view'] });
    expect(text).not.toContain(L.quickActionsTitle);

    text = render({ transactions: [purchaseToday], orgType: 'trader', permissions: ['receipt:create'] });
    expect(text).toContain(L.quickActionsTitle);
    expect(hrefs()).not.toContain('/cong-no');
    expect(hrefs()).not.toContain('/bao-cao');
  });
});
