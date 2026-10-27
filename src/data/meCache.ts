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

/**
 * Tài khoản có bản `/v1/me` trên máy và các tổ chức trong bản đó — để biết sổ nào trên máy còn người nhận.
 * Đọc lỏng (không qua schema): bản do app cũ ghi thiếu trường mới vẫn kể được tổ chức. Ném lỗi khi localStorage
 * bị chặn hay một bản hỏng không đọc nổi — không biết hết người nhận thì người gọi không được dọn gì.
 */
export const orgsInCachedMe = (): { readonly users: string[]; readonly orgIds: string[] } => {
  const users: string[] = [];
  const orgIds: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(KEY_PREFIX)) continue;
    users.push(key.slice(KEY_PREFIX.length));
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as { memberships?: unknown } | null;
    if (!Array.isArray(parsed?.memberships)) throw new Error(`Bản /v1/me trên máy không đọc được: ${key}`);
    for (const m of parsed.memberships as { organization?: { id?: unknown } }[]) {
      if (typeof m?.organization?.id === 'string') orgIds.push(m.organization.id);
    }
  }
  return { users, orgIds };
};

/** Đăng xuất: tên tổ chức, vai trò của người cũ không được ở lại máy cho người sau. */
export const forgetMe = (userId: string): void => {
  try {
    localStorage.removeItem(KEY_PREFIX + userId);
  } catch {
    // Bị chặn thì cũng không có gì để xoá.
  }
};
