/**
 * Ảnh phiếu cân / hoá đơn: IndexedDB ⇄ Supabase Storage.
 *
 * Ảnh luôn được lưu vào máy TRƯỚC. Chụp ảnh giữa rẫy không có sóng vẫn phải
 * xong việc; đẩy lên là chuyện của lúc có mạng.
 *
 * Đường dẫn trên Storage: /{user_id}/{attachment_id} — policy của bucket khớp
 * đúng thư mục đầu tiên với người đang đăng nhập.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { openLocalDb } from './localDb';

const BUCKET = 'attachments';
const SIGNED_URL_TTL_SECONDS = 3_600;

export const putLocalAttachment = async (id: string, blob: Blob): Promise<void> => {
  const db = await openLocalDb();
  await db.put('attachments', blob, id);
};

export const getLocalAttachment = async (id: string): Promise<Blob | undefined> => {
  const db = await openLocalDb();
  return db.get('attachments', id);
};

export const deleteLocalAttachment = async (id: string): Promise<void> => {
  const db = await openLocalDb();
  await db.delete('attachments', id);
};

const storagePath = (userId: string, id: string): string => `${userId}/${id}`;

export const uploadAttachment = async (
  supabase: SupabaseClient,
  userId: string,
  id: string,
  blob: Blob,
): Promise<void> => {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath(userId, id), blob, { upsert: true, contentType: blob.type });
  if (error) throw new Error(`Không tải được ảnh lên: ${error.message}`);
};

/** Bucket là private nên phải xin đường dẫn có chữ ký, không dùng URL công khai. */
export const signedAttachmentUrl = async (
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath(userId, id), SIGNED_URL_TTL_SECONDS);
  return error ? null : (data?.signedUrl ?? null);
};

export const removeAttachment = async (
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> => {
  await supabase.storage.from(BUCKET).remove([storagePath(userId, id)]);
};

/** Tải ảnh từ máy chủ về máy để lần sau xem được khi không có mạng. */
export const cacheRemoteAttachment = async (
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Blob | null> => {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath(userId, id));
  if (error || !data) return null;
  await putLocalAttachment(id, data);
  return data;
};
