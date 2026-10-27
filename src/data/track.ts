/**
 * Đo lường first-party (BE9 — Thumua365_BE docs/FRONTEND.md §5.12).
 *
 * `track()` chỉ ghi vào hàng đợi trong máy; `flushEvents()` gửi lô ≤ 50 khi có mạng, kể cả lúc
 * chưa đăng nhập. Danh mục và thuộc tính đúng `TrackedEvent` của contracts — kiểu TypeScript chặn
 * tên lạ và thuộc tính lạ (tên, SĐT, số tiền) ngay lúc biên dịch.
 *
 * Hàng đợi nằm ở localStorage: mất thì thôi (FRONTEND cho phép), đổi lại không phải nâng phiên bản
 * IndexedDB. Có giới hạn để máy không bao giờ đầy vì sự kiện.
 */

import { EVENTS_MAX_BATCH, type TrackedEvent, Utm } from '@mambo/contracts';
import { APP_VERSION } from '@/config';
import { newId } from '@mambo/core/id';
import { api, hasBackend } from './client';

const QUEUE_KEY = 'thumua365:events';
const ANON_KEY = 'thumua365:anonId';
const MAX_QUEUED = 500;
const UTM_KEY = 'thumua365:utm';

type Props<N extends TrackedEvent['name']> = Extract<TrackedEvent, { name: N }>['props'];

const read = (): TrackedEvent[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as TrackedEvent[];
  } catch {
    return [];
  }
};

const write = (events: readonly TrackedEvent[]): void => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUED)));
  } catch {
    // Bộ nhớ đầy hoặc bị chặn — mất sự kiện thì thôi, không làm hỏng việc chính.
  }
};

/** Id ngẫu nhiên sinh một lần cho máy này — không gắn với người. */
const anonId = (): string => {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = newId();
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return newId();
  }
};

export const platform = (): 'web' | 'pwa' =>
  typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'web';

/**
 * Nguồn khách tới (BE 0.26.0): link mở app có `utm_source` thì giữ trong máy — link mới có UTM thì thay — để gửi kèm
 * `app_opened` / `sign_up_completed`. Chuyển về chữ thường; sai hình dạng `Utm` của contracts thì bỏ, không gửi.
 */
export const captureUtm = (search: string): void => {
  const query = new URLSearchParams(search);
  const pick = (key: string) => query.get(`utm_${key}`)?.trim().toLowerCase() || undefined;
  const parsed = Utm.safeParse({ source: pick('source'), medium: pick('medium'), campaign: pick('campaign') });
  if (!parsed.success) return;
  try {
    localStorage.setItem(UTM_KEY, JSON.stringify(parsed.data));
  } catch {
    // Trình duyệt chặn lưu — mất nguồn thì thôi
  }
};

export const utmProps = (): { utm?: Utm } => {
  try {
    const parsed = Utm.safeParse(JSON.parse(localStorage.getItem(UTM_KEY) ?? 'null'));
    return parsed.success ? { utm: parsed.data } : {};
  } catch {
    return {};
  }
};

export const clearTrackQueue = (): void => {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Trình duyệt chặn lưu
  }
};

export function track<N extends TrackedEvent['name']>(name: N, props: Props<N>): void {
  if (!hasBackend()) return; // sổ của máy này: không có nơi gửi, không chất đầy máy
  const event = { anonId: anonId(), at: new Date().toISOString(), platform: platform(), appVersion: APP_VERSION, name, props };
  write([...read(), event as TrackedEvent]);
}

let flushing = false;

/**
 * Gửi hàng đợi theo lô. Mất mạng / máy chủ lỗi → dừng, giữ phần chưa gửi. `dropped` > 0 là lỗi của
 * app (sai danh mục) — vẫn xoá khỏi hàng đợi, không gửi lại.
 */
export const flushEvents = async (): Promise<void> => {
  if (flushing) return;
  flushing = true;
  try {
    for (let batch = read().slice(0, EVENTS_MAX_BATCH); batch.length > 0; batch = read().slice(0, EVENTS_MAX_BATCH)) {
      await api.events.track({ events: batch });
      // Sự kiện mới có thể vừa vào đuôi hàng đợi trong lúc gửi — chỉ bỏ đúng phần đã gửi ở đầu.
      write(read().slice(batch.length));
    }
  } catch {
    // Lượt sau thử lại.
  } finally {
    flushing = false;
  }
};

const FLUSH_MS = 60_000;

/** Gọi một lần khi app khởi động: ghi `app_opened`, gửi ngay, rồi gửi lại mỗi 60 giây và khi có mạng trở lại. */
export const startEventFlushing = (): void => {
  if (!hasBackend()) return;
  captureUtm(location.search);
  track('app_opened', utmProps());
  void flushEvents();
  setInterval(() => void flushEvents(), FLUSH_MS);
  window.addEventListener('online', () => void flushEvents());
};
