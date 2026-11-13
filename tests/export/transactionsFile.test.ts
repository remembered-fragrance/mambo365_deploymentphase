import { describe, expect, it } from 'vitest';
import type { Transaction } from '@mambo/core/types';
import { listHtml } from '@/export/transactionsFile';

const tx = (supplierName: string, productName: string): Transaction => ({
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  date: '2026-08-08T03:00:00.000Z',
  kind: 'purchase',
  counterpartyId: 'bbbbbbbb-1111-4111-8111-111111111111',
  supplierId: 'bbbbbbbb-1111-4111-8111-111111111111',
  supplierName,
  lines: [
    {
      id: 'cccccccc-1111-4111-8111-111111111111',
      productName,
      unit: 'kg',
      formulaType: 'standard',
      grossWeight: 10,
      pricePerUnit: 1_000,
      rawTotal: 10_000,
      roundedTotal: 10_000,
    },
  ],
  payments: [],
  amountPaid: 0,
});

describe('listHtml — bảng PDF danh sách phiếu', () => {
  it('tên đối tác / mặt hàng chứa thẻ HTML được in ra như chữ, không thành thẻ', () => {
    const html = listHtml([tx('<img src=x onerror=alert(1)>', 'Mủ "chén" & <b>')]);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('Mủ &quot;chén&quot; &amp; &lt;b&gt;');
  });
});
