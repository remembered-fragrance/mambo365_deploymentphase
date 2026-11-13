/**
 * Cờ "đang xem dữ liệu mẫu".
 *
 * 🔴 Cờ này là điều kiện để banner đỏ luôn xuất hiện. Lỗi chặn L1 (bản demo tự
 * gieo dữ liệu mẫu vào sổ thật) chỉ không quay lại nếu KHÔNG BAO GIỜ có dữ
 * liệu mẫu mà không có cờ. Vì vậy cờ nằm ngoài `AppData`: nó không đi theo
 * đường đồng bộ, không lẫn vào sổ, và mất sổ thì cờ cũng vô hại.
 *
 * Cờ gắn với MỘT sổ (id tổ chức, hoặc id tài khoản của máy): cờ còn quyết định thao tác có
 * được gửi lên máy chủ hay không. Cờ chung cho cả máy thì bật mẫu ở tổ chức B là tổ chức A
 * ngừng đồng bộ, và "Xoá hết" ở A xoá luôn phiếu thật chưa gửi.
 *
 * Lưu ở localStorage để tắt app mở lại vẫn còn banner — người trình diễn ở
 * điểm thu mua hay tắt bật app liên tục.
 */

const KEY = 'thumua365:demo';
/** Giá trị của bản cũ (trước khi cờ gắn theo sổ): không biết sổ nào nên coi như mọi sổ. */
const LEGACY_ANY_BOOK = '1';

const listeners = new Set<() => void>();

const stored = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const isDemoActive = (bookKey: string | null | undefined): boolean => {
  const value = stored();
  return value !== null && (value === LEGACY_ANY_BOOK || value === bookKey);
};

const notify = (): void => {
  for (const listener of listeners) listener();
};

export const setDemoActive = (bookKey: string, on: boolean): void => {
  if (on) localStorage.setItem(KEY, bookKey);
  else if (isDemoActive(bookKey)) localStorage.removeItem(KEY);
  notify();
};

/** Dọn sổ khỏi máy (đăng xuất, xoá tài khoản): cờ của sổ đó đi theo. */
export const forgetDemo = (bookKeys: readonly string[]): void => {
  const value = stored();
  if (value === null || (value !== LEGACY_ANY_BOOK && !bookKeys.includes(value))) return;
  localStorage.removeItem(KEY);
  notify();
};

export const subscribeDemo = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
