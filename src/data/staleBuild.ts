/**
 * Trang đang chạy bản build cũ xin một chunk mà lần deploy mới đã xoá (đổi hash) ⇒ 404,
 * "Failed to fetch dynamically imported module". Hay gặp ngay lúc đăng nhập: màn của từng vỏ
 * tải lười, và service worker `autoUpdate` đã thay bản mới, dọn cache cũ trong lúc trang cũ còn mở.
 *
 * Vite báo việc này bằng sự kiện `vite:preloadError` — tải lại MỘT lần là lấy `index.html` mới.
 * Ở đây vì chạm sessionStorage. Vừa tự tải lại mà vẫn lỗi (server hỏng thật, mất mạng) thì
 * không tải nữa: lỗi đi tiếp tới ErrorBoundary, người dùng còn nút "Tải lại" và "Lưu ra file".
 */

const KEY = 'thumua365:stale-build-reload';
/** Lần tự tải lại trước còn trong khoảng này ⇒ không tải nữa, tránh vòng lặp tải lại. */
const GUARD_MS = 10_000;

const lastReload = (): number | null => {
  try {
    const value = Number(sessionStorage.getItem(KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

/** Trả `true` nếu đã chặn lỗi và tải lại trang. */
export const reloadForStaleBuild = (event: Event, reload: () => void, now = Date.now()): boolean => {
  const last = lastReload();
  if (last !== null && now - last < GUARD_MS) return false;
  try {
    sessionStorage.setItem(KEY, String(now));
  } catch {
    // Không ghi được cờ chống lặp thì không dám tự tải lại.
    return false;
  }
  event.preventDefault();
  reload();
  return true;
};

export const watchStaleBuild = (): void => {
  window.addEventListener('vite:preloadError', (event) => {
    reloadForStaleBuild(event, () => window.location.reload());
  });
};
