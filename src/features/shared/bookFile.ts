/**
 * Lưu sổ ra file — dùng ở hai chỗ, viết một lần.
 *
 * 1. Màn Tài khoản: người dùng chủ động bấm "Lưu ra file".
 * 2. Màn hình lỗi: app vừa vỡ, thứ đầu tiên phải làm là cứu dữ liệu ra ngoài.
 *
 * Chỗ thứ hai nằm NGOÀI `<StoreProvider>` nên không gọi hook được — vì vậy
 * `AppLayout` đăng ký một hàm đọc sổ, và màn hình lỗi chỉ việc gọi nó.
 */

import { useEffect } from 'react';
import type { AppData } from '@/core/types';

const FILE_NAME = 'thumua365-so.json';

let readBook: (() => AppData) | null = null;

export const downloadBook = async (data: AppData): Promise<void> => {
  const { downloadBlob } = await import('@/export/downloadFile');
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), FILE_NAME);
};

/** Màn hình lỗi gọi hàm này. Chưa có sổ nào được đăng ký thì im lặng bỏ qua. */
export const saveBookToFile = (): void => {
  const data = readBook?.();
  if (data) void downloadBook(data);
};

/** Giữ cho hàm cứu hộ luôn nhìn thấy bản sổ mới nhất. */
export function useBookRescue(data: AppData): void {
  useEffect(() => {
    readBook = () => data;
    return () => {
      readBook = null;
    };
  }, [data]);
}
