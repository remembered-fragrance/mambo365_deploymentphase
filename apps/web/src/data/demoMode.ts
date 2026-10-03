/**
 * Cờ "đang xem dữ liệu mẫu".
 *
 * 🔴 Cờ này là điều kiện để banner đỏ luôn xuất hiện. Lỗi chặn L1 (bản demo tự
 * gieo dữ liệu mẫu vào sổ thật) chỉ không quay lại nếu KHÔNG BAO GIỜ có dữ
 * liệu mẫu mà không có cờ. Vì vậy cờ nằm ngoài `AppData`: nó không đi theo
 * đường đồng bộ, không lẫn vào sổ, và mất sổ thì cờ cũng vô hại.
 *
 * Lưu ở localStorage để tắt app mở lại vẫn còn banner — người trình diễn ở
 * điểm thu mua hay tắt bật app liên tục.
 */

const KEY = 'thumua365:demo';

const listeners = new Set<() => void>();

export const isDemoActive = (): boolean => localStorage.getItem(KEY) === '1';

export const setDemoActive = (on: boolean): void => {
  if (on) localStorage.setItem(KEY, '1');
  else localStorage.removeItem(KEY);
  for (const listener of listeners) listener();
};

export const subscribeDemo = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
