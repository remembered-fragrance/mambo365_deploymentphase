/**
 * Bản `/v1/me` lần cuối của từng tài khoản, nằm trong máy.
 *
 * Mở app khi đã đăng nhập thì vào sổ NGAY bằng bản này rồi mới hỏi lại máy chủ ở nền.
 * Trước đây cả app đứng ở màn xương chờ `/v1/me` — mà API trên gói free của Render ngủ sau
 * 15 phút không ai gọi, đánh thức mất 20–50 giây; sổ trong IndexedDB có sẵn cũng không hiện
 * được vì chưa biết đang ở tổ chức nào.
 *
 * Quyền đọc ở đây chỉ để vẽ giao diện; máy chủ vẫn kiểm từng lời gọi. Bản cũ lệch (bị gỡ khỏi
 * tổ chức, đổi vai trò) sống tới khi `/v1/me` trả lời rồi bị thay. Đọc lại phải qua schema của
 * hợp đồng: bản do app phiên bản cũ ghi có thể thiếu trường mới — sai thì coi như chưa có.
 */

import { Me } from '@mambo/contracts';

const KEY_PREFIX = 'thumua365:me:';

export const rememberMe = (me: Me): void => {
  try {
    localStorage.setItem(KEY_PREFIX + me.user.id, JSON.stringify(me));
  } catch {
    // Bộ nhớ đầy hoặc bị chặn — lần mở sau chỉ chậm hơn, không sai.
  }
};

export const recallMe = (userId: string): Me | null => {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    if (!raw) return null;
    const parsed = Me.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.user.id === userId ? parsed.data : null;
  } catch {
    return null;
  }
};

/** Đăng xuất: tên tổ chức, vai trò của người cũ không được ở lại máy cho người sau. */
export const forgetMe = (userId: string): void => {
  try {
    localStorage.removeItem(KEY_PREFIX + userId);
  } catch {
    // Bị chặn thì cũng không có gì để xoá.
  }
};
