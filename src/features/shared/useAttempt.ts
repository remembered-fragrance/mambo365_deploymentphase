import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { L } from '@/i18n/labels';

/** Kết quả một lần thử: `null` = máy không nhận, đã báo người dùng. Bọc trong `{ value }` vì action có thể trả `null` / `void`. */
export type Attempted<T> = { readonly value: T } | null;

/**
 * Chạy một action của store, máy không nhận thì NÓI RA (B4).
 *
 * `commit` ném lỗi khi op không hợp lệ (`opProblem` — chữ dài quá, số vượt mức máy chủ nhận) hay sổ chưa sẵn
 * sàng. Không bắt là bấm Lưu không có phản hồi gì: người dùng tưởng đã lưu, hoặc bấm mãi không hiểu vì sao.
 */
export function useAttempt() {
  const toast = useToast();
  return useCallback(
    <T,>(action: () => T): Attempted<T> => {
      try {
        return { value: action() };
      } catch (error) {
        toast({ message: error instanceof Error ? error.message : L.cannotSaveInvalid, tone: 'alert' });
        return null;
      }
    },
    [toast],
  );
}
