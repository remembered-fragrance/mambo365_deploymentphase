/**
 * Xoá tài khoản và toàn bộ dữ liệu — thật, không phải đánh dấu vô hiệu hoá.
 *
 * 🔴 THỨ TỰ Ở ĐÂY LÀ BẮT BUỘC, không phải sở thích:
 *
 *   1. Xoá **file ảnh trên Storage** trước. Chúng không đi theo `on delete
 *      cascade`, và ngay khi hàng `auth.users` mất thì không ai còn quyền xoá
 *      chúng nữa — policy Storage khớp theo `auth.uid()`. Làm sau là để lại
 *      ảnh chứng từ của người ta nằm mãi trên máy chủ, đúng thứ mà trang Quyền
 *      riêng tư vừa hứa sẽ không xảy ra.
 *   2. Xoá **hàng `auth.users`** qua RPC. Cascade kéo theo mọi bảng nghiệp vụ.
 *   3. Xoá **dấu vết trong máy**: sổ, hàng đợi, ảnh trong IndexedDB, phiên đăng
 *      nhập. Máy này có thể là máy mượn.
 *
 * Bước 1 hỏng thì DỪNG. Xoá tài khoản khi ảnh vẫn còn là trạng thái không ai
 * dọn được nữa — kể cả quản trị viên cũng chỉ còn cách dò tay theo id.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { clearUserCache } from './cache';
import { openLocalDb } from './localDb';
import { clearQueue } from './queue';
import { forgetSubscription } from './subscriptionStore';

const BUCKET = 'attachments';

const removeStoredAttachments = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<void> => {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId);
  if (error) throw new Error(`Không đọc được danh sách ảnh: ${error.message}`);
  if (!data || data.length === 0) return;

  const paths = data.map((file) => `${userId}/${file.name}`);
  const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
  if (removeError) throw new Error(`Không xoá được ảnh: ${removeError.message}`);
};

/**
 * Xoá mọi thứ của tài khoản này khỏi máy đang dùng.
 *
 * Kho ảnh trong máy đánh khoá theo id ảnh chứ không theo người dùng, nên
 * `clear` ở đây dọn cả ảnh mà tài khoản khác từng xem trên chính máy này. Chấp
 * nhận: đó chỉ là bản sao để xem lúc mất mạng, tài khoản kia đăng nhập lại là
 * tải về được. Đổi lại, sau khi xoá tài khoản không còn ảnh chứng từ nào của ai
 * nằm lại trên một cái máy có thể là máy mượn.
 */
const wipeLocalTraces = async (userId: string): Promise<void> => {
  await clearUserCache(userId);
  await clearQueue();
  forgetSubscription(userId);

  const db = await openLocalDb();
  await db.clear('attachments');
};

export const deleteAccount = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<void> => {
  await removeStoredAttachments(supabase, userId);

  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw new Error(`Không xoá được tài khoản: ${error.message}`);

  await wipeLocalTraces(userId);
  await supabase.auth.signOut();
};
