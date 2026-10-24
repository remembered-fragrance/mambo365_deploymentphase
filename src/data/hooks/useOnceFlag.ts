/**
 * Những thứ chỉ hiện MỘT lần cho mỗi máy: hướng dẫn bốn bước, lời chào…
 *
 * Ở tầng dữ liệu vì nó chạm localStorage, và vì "đã xem hướng dẫn chưa" là
 * chuyện của cái máy chứ không phải của sổ — cài lại app thì xem lại là đúng.
 */

import { useCallback, useState } from 'react';

/** `tax-ledger-ack`: đã bấm "Tôi hiểu" trước lần xuất bảng kê thu mua đầu tiên (KE_HOACH_GOI_PRO §4.2). */
export type OnceKey = 'coach-first-receipt' | 'tax-ledger-ack';

const storageKey = (key: OnceKey): string => `thumua365:once:${key}`;

export interface OnceFlag {
  readonly done: boolean;
  readonly markDone: () => void;
}

export function useOnceFlag(key: OnceKey): OnceFlag {
  const [done, setDone] = useState(() => localStorage.getItem(storageKey(key)) === '1');

  const markDone = useCallback(() => {
    localStorage.setItem(storageKey(key), '1');
    setDone(true);
  }, [key]);

  return { done, markDone };
}
