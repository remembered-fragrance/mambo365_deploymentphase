// @vitest-environment jsdom
/**
 * Lời mời cài app: giữ đúng sự kiện của trình duyệt, mỗi sự kiện chỉ mở hộp cài một lần, cài xong thì thôi mời.
 */

import { describe, expect, it, vi } from 'vitest';
import { installAvailable, promptInstall, watchInstallPrompt } from '@/features/shared/installPrompt';

const offer = () => {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
  });
  window.dispatchEvent(event);
  return event;
};

describe('lời mời cài app', () => {
  watchInstallPrompt();

  it('chưa có sự kiện ⇒ không mời', async () => {
    expect(installAvailable()).toBe(false);
    await expect(promptInstall()).resolves.toBeUndefined();
  });

  it('🔴 có sự kiện: chặn thanh mặc định, mời được; bấm cài ⇒ mở hộp đúng một lần', async () => {
    const event = offer();
    expect(event.defaultPrevented).toBe(true);
    expect(installAvailable()).toBe(true);

    await promptInstall();
    await promptInstall();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(installAvailable()).toBe(false);
  });

  it('cài xong ⇒ thôi mời', () => {
    offer();
    window.dispatchEvent(new Event('appinstalled'));
    expect(installAvailable()).toBe(false);
  });
});
