// @vitest-environment jsdom
/**
 * B4: lưu form mà máy không nhận (`commit` ném — chữ dài quá, số vượt mức) phải NÓI RA, và ô nhập chặn trước
 * đúng độ dài schema đồng bộ nhận.
 */

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PARTY_LIMITS } from '@mambo/contracts';
import { ToastProvider } from '@/components/ui/Toast';
import { PartnerFormDialog, emptyParty } from '@/features/partners/PartnerFormDialog';
import { useAttempt, type Attempted } from '@/features/shared/useAttempt';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const render = (node: ReactNode) =>
  act(() => root.render(createElement(ToastProvider, null, node)));

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('lỗi khi lưu không bị nuốt (B4)', () => {
  it('🔴 action ném lỗi: báo bằng toast, trả null để form còn mở', () => {
    let attempt: ReturnType<typeof useAttempt> = () => null;
    function Probe() {
      attempt = useAttempt();
      return null;
    }
    render(createElement(Probe));

    let failed: Attempted<void> = { value: undefined };
    act(() => {
      failed = attempt(() => {
        throw new Error('Chưa lưu được — tên dài quá');
      });
    });
    expect(failed).toBeNull();
    expect(document.body.textContent).toContain('Chưa lưu được — tên dài quá');

    let ok: Attempted<number> = null;
    act(() => { ok = attempt(() => 42); });
    expect(ok).toEqual({ value: 42 });
  });

  it('form đối tác chặn độ dài đúng bằng schema đồng bộ', () => {
    render(createElement(PartnerFormDialog, {
      open: true,
      role: 'supplier',
      initial: emptyParty(),
      hasNamesake: () => false,
      onSave: () => undefined,
      onClose: () => undefined,
    }));
    const limits = [...document.querySelectorAll('input')].map((i) => i.maxLength);
    expect(limits).toEqual([PARTY_LIMITS.name, PARTY_LIMITS.phone, PARTY_LIMITS.location, PARTY_LIMITS.note]);
  });
});
