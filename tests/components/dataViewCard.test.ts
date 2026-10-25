// @vitest-environment jsdom
/**
 * Thẻ của danh sách (điện thoại) phải được đọc bằng chính nội dung thẻ. Từng gắn `aria-label` = tên bảng ⇒ trình đọc
 * màn hình đọc mọi thẻ phiếu là "Lịch sử giao dịch", không phân biệt được phiếu của ai.
 */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Row {
  readonly id: string;
  readonly name: string;
  readonly money: string;
}

const columns: Column<Row>[] = [
  { id: 'name', header: 'Đối tác', cell: (r) => r.name, mobile: 'title' },
  { id: 'money', header: 'Tổng phiếu', cell: (r) => r.money, mobile: 'value' },
];

describe('DataView — thẻ trên điện thoại', () => {
  it('🔴 thẻ bấm được không đè tên bảng lên nội dung — mỗi thẻ đọc ra đúng người, đúng tiền', () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() =>
      root.render(
        createElement(DataView<Row>, {
          rows: [
            { id: '1', name: 'Cô Mai', money: '1.438.000₫' },
            { id: '2', name: 'Chú Bảy', money: '4.928.000₫' },
          ],
          columns,
          getKey: (r) => r.id,
          caption: 'Lịch sử giao dịch',
          onRowClick: () => undefined,
        }),
      ),
    );

    const cards = [...host.querySelectorAll('ul button')];
    expect(cards).toHaveLength(2);
    for (const card of cards) expect(card.hasAttribute('aria-label')).toBe(false);
    expect(cards.map((c) => c.textContent)).toEqual(['Cô Mai1.438.000₫', 'Chú Bảy4.928.000₫']);
    // Tên bảng vẫn còn cho dạng bảng (máy tính, trình đọc màn hình).
    expect(host.querySelector('caption')?.textContent).toBe('Lịch sử giao dịch');
    act(() => root.unmount());
  });
});
