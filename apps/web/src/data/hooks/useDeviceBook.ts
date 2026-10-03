/**
 * Sổ đã ghi khi chưa đăng nhập.
 *
 * Người dùng thử app trước, đăng ký sau — đó là cách gần như tất cả họ sẽ gặp
 * app này lần đầu. Nếu đăng nhập xong mà sổ trống trơn thì công cân cả buổi
 * sáng coi như mất, và họ sẽ không quay lại. Hook này cho màn hình một câu hỏi
 * đơn giản: "máy này còn N phiếu chưa vào tài khoản, đưa vào chứ?"
 */

import { useCallback, useEffect, useState } from 'react';
import type { AppData } from '@/core/types';
import { readBook } from '../cache';
import { peekDeviceAccount } from '../deviceAccount';
import { useStore } from '../useStore';

export interface DeviceBook {
  /** Số phiếu đang nằm trong sổ của máy. 0 nghĩa là không có gì để đưa vào. */
  readonly count: number;
  readonly importDeviceBook: () => void;
}

export function useDeviceBook(): DeviceBook {
  const { user, importData } = useStore();
  const [book, setBook] = useState<AppData | null>(null);

  const deviceId = peekDeviceAccount()?.id;
  const otherAccount = Boolean(deviceId && user && user.id !== deviceId);

  useEffect(() => {
    if (!deviceId || !otherAccount) {
      setBook(null);
      return;
    }
    let cancelled = false;
    void readBook(deviceId).then((cached) => {
      if (!cancelled) setBook(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, otherAccount]);

  const importDeviceBook = useCallback(() => {
    if (book) importData(book);
  }, [book, importData]);

  return { count: book?.transactions.length ?? 0, importDeviceBook };
}
