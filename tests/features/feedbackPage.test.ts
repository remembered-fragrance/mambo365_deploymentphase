// @vitest-environment jsdom
/**
 * Màn `/gop-y` (G1.3): chưa chọn sao thì không gửi; gửi đúng số sao + góp ý; lỗi (mất mạng, quá hạn mức) hiện ra
 * và giữ nguyên những gì người dùng đã gõ.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackPage } from '@/features/feedback/FeedbackPage';
import { L } from '@/i18n/labels';

const sendFeedback = vi.fn<(rating: number, comment: string) => Promise<void>>();
vi.mock('@/data/hooks/useFeedback', () => ({ sendFeedback: (rating: number, comment: string) => sendFeedback(rating, comment) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

const star = (n: number) => host.querySelector<HTMLButtonElement>(`button[aria-label="${n} ${L.feedbackStars}"]`);
const sendButton = () => [...host.querySelectorAll('button')].find((b) => b.textContent === L.feedbackSend);
const textarea = () => host.querySelector('textarea');

const type = (value: string) => {
  const el = textarea();
  if (!el) throw new Error('Không thấy ô góp ý');
  // React theo dõi giá trị qua setter gốc — gán thẳng `el.value` thì onChange không chạy.
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

const click = async (el: HTMLElement | null | undefined) => {
  if (!el) throw new Error('Không thấy nút');
  await act(async () => el.click());
};

beforeEach(() => {
  sendFeedback.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(FeedbackPage)));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('màn Góp ý & chấm sao', () => {
  it('chưa chọn sao → báo, không gửi', async () => {
    await click(sendButton());
    expect(host.textContent).toContain(L.feedbackRatingRequired);
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it('chọn 4 sao + góp ý → gửi đúng, hiện lời cảm ơn', async () => {
    sendFeedback.mockResolvedValue();
    await click(star(4));
    expect(star(4)?.getAttribute('aria-pressed')).toBe('true');
    expect(star(5)?.getAttribute('aria-pressed')).toBe('false');
    act(() => type('Bàn phím to dễ bấm'));
    await click(sendButton());

    expect(sendFeedback).toHaveBeenCalledWith(4, 'Bàn phím to dễ bấm');
    expect(host.querySelector('[role="status"]')?.textContent).toBe(L.feedbackThanks);
  });

  it('🔴 gửi lỗi → hiện lỗi, giữ số sao và lời góp ý để gửi lại', async () => {
    sendFeedback.mockRejectedValue(new Error(L.feedbackOffline));
    await click(star(2));
    act(() => type('Đồng bộ chậm'));
    await click(sendButton());

    expect(host.querySelector('[role="alert"]')?.textContent).toBe(L.feedbackOffline);
    expect(star(2)?.getAttribute('aria-pressed')).toBe('true');
    expect(textarea()?.value).toBe('Đồng bộ chậm');
  });
});
