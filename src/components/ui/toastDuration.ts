import { UNDO_MS } from '@/config';

/** Khoảng đọc cho mỗi ký tự — chừng 200 từ / phút, người cân vừa đọc vừa làm. */
const MS_PER_CHAR = 60;
const MAX_MS = 20_000;

/**
 * Toast báo (không có "Hoàn tác") giữ đủ lâu để đọc hết câu — câu báo đồng bộ gộp được tới ba ý.
 * Có "Hoàn tác" thì giữ đúng `UNDO_MS`: đó là khoảng người dùng được hoàn tác, không kéo dài theo chữ.
 */
export const toastDuration = (request: { readonly message: string; readonly onUndo?: unknown }): number =>
  request.onUndo ? UNDO_MS : Math.min(MAX_MS, Math.max(UNDO_MS, request.message.length * MS_PER_CHAR));
