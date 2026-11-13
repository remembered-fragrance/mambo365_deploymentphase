// @vitest-environment jsdom
/**
 * Bản in (biên nhận, báo cáo) giữ tiêu đề trang nhưng bỏ hàng nút — biên nhận in ra từng dính "Gửi Zalo · In · ⋯".
 */

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '@/components/layout/PageHeader';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PageHeader khi in', () => {
  it('🔴 hàng nút nằm trong vùng `no-print`, tiêu đề thì không', () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() =>
      root.render(createElement(PageHeader, { title: 'Phiếu thu mua', actions: createElement('button', null, 'In') })),
    );

    expect(host.querySelector('button')?.closest('.no-print')).not.toBeNull();
    expect(host.querySelector('h1')?.closest('.no-print')).toBeNull();
    act(() => root.unmount());
  });
});
