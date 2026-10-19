// @vitest-environment jsdom
/**
 * Thẻ "Dữ liệu của bạn" nói đúng sổ nằm ở đâu (B1): sổ tổ chức là sổ máy chủ — đổi máy chỉ cần đăng nhập. Ghi
 * "Sổ nằm trong máy" với sổ tổ chức là đẩy người dùng đi giữ file như thể mất máy là mất sổ.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyData } from '@mambo/core/normalize';
import { ToastProvider } from '@/components/ui/Toast';
import { StoreContext, type StoreValue } from '@/data/useStore';
import { DataCard } from '@/features/profile/DataCard';
import { L } from '@/i18n/labels';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

const render = (importsFromFile: boolean) => {
  const store = { data: emptyData(), importData: () => undefined, importsFromFile } as unknown as StoreValue;
  act(() => root.render(createElement(ToastProvider, null,
    createElement(StoreContext.Provider, { value: store }, createElement(DataCard)))));
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('thẻ Dữ liệu (B1)', () => {
  it('🔴 sổ tổ chức: nói sổ nằm trên máy chủ, không có nút lấy lại từ file', () => {
    render(false);
    expect(host.textContent).toContain(L.dataHintServer);
    expect(host.textContent).not.toContain(L.dataHint);
    expect(host.textContent).not.toContain(L.importFromFile);
  });

  it('sổ riêng trên máy: giữ câu cũ và nút lấy lại từ file', () => {
    render(true);
    expect(host.textContent).toContain(L.dataHint);
    expect(host.textContent).toContain(L.importFromFile);
  });
});
