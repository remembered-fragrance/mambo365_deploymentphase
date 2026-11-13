/**
 * Các tổ chức mà một tài khoản từng có sổ trên máy này (B8).
 *
 * `/v1/me` chỉ kể tổ chức người dùng CÒN ở. Bị gỡ rồi thì tổ chức đó biến khỏi danh sách, nên đăng xuất dọn
 * theo `/v1/me` sẽ bỏ sót đúng sổ của tổ chức đã gỡ mình: phiếu, công nợ, SĐT đối tác nằm lại trên máy, op
 * chưa gửi chờ người sau đăng nhập. Danh sách này nhớ cả tên để còn báo "Bạn không còn ở <tên>".
 */

const PREFIX = 'thumua365_books:';
const keyOf = (userId: string): string => `${PREFIX}${userId}`;

export interface KnownBook {
  readonly id: string;
  readonly name: string;
}

export const knownBooks = (userId: string): KnownBook[] => {
  try {
    const raw = localStorage.getItem(keyOf(userId));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((b): b is KnownBook => typeof b?.id === 'string' && typeof b?.name === 'string')
      : [];
  } catch {
    return [];
  }
};

const save = (userId: string, list: readonly KnownBook[]): void => {
  try {
    if (list.length === 0) localStorage.removeItem(keyOf(userId));
    else localStorage.setItem(keyOf(userId), JSON.stringify(list));
  } catch {
    // Trình duyệt chặn lưu: lần đăng xuất vẫn dọn theo `/v1/me` như trước.
  }
};

/** Thêm / cập nhật tên các tổ chức hiện có; tổ chức cũ chưa dọn thì giữ. */
export const rememberBooks = (userId: string, books: readonly KnownBook[]): void => {
  const fresh = new Map(books.map((b) => [b.id, b]));
  const kept = knownBooks(userId).filter((b) => !fresh.has(b.id));
  save(userId, [...kept, ...fresh.values()]);
};

/** Các tài khoản đang có danh sách sổ trên máy này. Ném lỗi khi localStorage bị chặn — người gọi phải dừng. */
export const usersWithBooks = (): string[] => {
  const users: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) users.push(key.slice(PREFIX.length));
  }
  return users;
};

/** Đã dọn sổ khỏi máy. Không truyền `ids`: quên hết (đăng xuất). */
export const forgetBooks = (userId: string, ids?: readonly string[]): void => {
  save(userId, ids ? knownBooks(userId).filter((b) => !ids.includes(b.id)) : []);
};
