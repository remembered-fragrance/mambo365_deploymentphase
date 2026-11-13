// @vitest-environment jsdom
/**
 * Bàn phím số lớn: phím phải nằm đúng chỗ như bàn phím điện thoại. Lưới bốn cột với hàng ba phím từng xếp thành
 * `7 8 9 4 / 5 6 1 2 …` — người gõ theo trí nhớ ra sai số cân, sai tiền.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Numpad } from '@/components/ui/Numpad';
import { L } from '@/i18n/labels';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

const render = (onNext?: () => void) => {
  act(() =>
    root.render(
      createElement(Numpad, { label: 'x', display: '', onKeyPress: () => undefined, onClose: () => undefined, onNext }),
    ),
  );
};

/** Phím theo hàng, đúng thứ tự mắt nhìn: chia danh sách nút theo số cột của lưới. */
const rows = (): string[][] => {
  const grid = host.querySelector('.grid');
  const cols = Number(/grid-cols-(\d+)/.exec(grid?.className ?? '')?.[1]);
  const labels = [...(grid?.querySelectorAll('button') ?? [])].map((b) => b.getAttribute('aria-label') ?? '');
  return Array.from({ length: Math.ceil(labels.length / cols) }, (_, i) => labels.slice(i * cols, i * cols + cols));
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

describe('Numpad', () => {
  it('🔴 xếp phím như bàn phím điện thoại, hàng cuối là xoá lùi · xoá hết · tiếp', () => {
    render(() => undefined);
    expect(rows()).toEqual([
      ['7', '8', '9'],
      ['4', '5', '6'],
      ['1', '2', '3'],
      ['000', '0', ','],
      [L.del, L.clearAll, L.next],
    ]);
  });

  it('🔴 mỗi phím đúng một màu nền — hai class nền thì nút Tiếp từng ra chữ giấy trên nền giấy', () => {
    render();
    for (const key of host.querySelectorAll('.grid button')) {
      expect(key.className.match(/(?<![:\w-])bg-[\w-]+/g), key.getAttribute('aria-label') ?? '').toHaveLength(1);
    }
    expect(host.querySelector(`[aria-label="${L.close}"]`)?.className).toContain('bg-brand');
  });
});
