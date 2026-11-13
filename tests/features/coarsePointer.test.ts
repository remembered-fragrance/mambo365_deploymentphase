// @vitest-environment jsdom
/**
 * Bàn phím số lớn hiện trên máy cảm ứng. Máy cảm ứng có gắn thiết bị trỏ (bút, chuột ảo của emulator Android) báo
 * `pointer: fine` nhưng `hover: none` — đã gặp thật trên emulator Android 14: app mở bàn phím hệ thống thay bàn phím số.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoarsePointer } from '@/features/shared/useCoarsePointer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

/** matchMedia giả: danh sách cách nhau dấu phẩy khớp khi MỘT vế khớp, như trình duyệt thật. */
const device = (features: readonly string[]) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.split(',').some((part) => features.includes(part.trim())),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

const touch = (): boolean => {
  let seen = false;
  function Probe() {
    seen = useCoarsePointer();
    return null;
  }
  act(() => root.render(createElement(Probe)));
  return seen;
};

beforeEach(() => {
  host = document.createElement('div');
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

describe('useCoarsePointer', () => {
  it('điện thoại cảm ứng thường ⇒ bàn phím số', () => {
    device(['(pointer: coarse)', '(hover: none)']);
    expect(touch()).toBe(true);
  });

  it('🔴 máy cảm ứng báo `pointer: fine` mà không rê được (bút, emulator) ⇒ vẫn bàn phím số', () => {
    device(['(pointer: fine)', '(hover: none)']);
    expect(touch()).toBe(true);
  });

  it('máy tính dùng chuột ⇒ bàn phím thường', () => {
    device(['(pointer: fine)', '(hover: hover)']);
    expect(touch()).toBe(false);
  });
});
