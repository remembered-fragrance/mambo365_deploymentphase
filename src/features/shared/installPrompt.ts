/**
 * Lời mời "Cài app lên màn hình chính" của Chrome (Android, máy tính). Safari không có sự kiện này — người dùng
 * iPhone làm theo hướng dẫn "Thêm vào MH chính".
 *
 * Sự kiện bắn rất sớm, trước khi màn Trang chủ (tải lười) kịp nghe ⇒ nghe từ lúc mở app (`main.tsx`), giữ lại ở đây.
 */

import { useSyncExternalStore } from 'react';

/** `beforeinstallprompt` — chưa có trong lib.dom của TypeScript. */
interface InstallPromptEvent extends Event {
  readonly prompt: () => Promise<void>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((listener) => listener());

export const watchInstallPrompt = (): void => {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Chặn thanh nhỏ của Chrome: app tự mời bằng thẻ của mình, đúng lúc ở Trang chủ.
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
};

export const installAvailable = (): boolean => deferred !== null;

/** Mở hộp cài của trình duyệt. Mỗi sự kiện chỉ gọi `event.prompt()` được một lần ⇒ bỏ ngay, đợi trình duyệt bắn cái mới. */
export const promptInstall = async (): Promise<void> => {
  const event = deferred;
  if (!event) return;
  deferred = null;
  emit();
  await event.prompt();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useInstallAvailable = (): boolean => useSyncExternalStore(subscribe, installAvailable, () => false);
