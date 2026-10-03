/**
 * Ảnh phiếu cân / hoá đơn: IndexedDB & Storage.
 *
 * Ảnh luôn được lưu vào máy TRƯỚC. Chụp ảnh giữa rẫy không có sóng vẫn phải
 * xong việc; đẩy lên là chuyện của lúc có mạng.
 *
 * Backend sẽ cấp URL ký sẵn ở BE8 (POST /v1/attachments/upload-url).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FeatureUnavailableError } from './capabilities';
import { openLocalDb } from './localDb';

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

export const uploadAttachment = async (
  _supabase: SupabaseClient,
  _userId: string,
  _id: string,
  _blob: Blob,
): Promise<void> => {
  throw new FeatureUnavailableError('Attachments');
};

/** Bucket là private. BE8 sẽ cấp URL có hạn từ API. */
export const signedAttachmentUrl = async (
  _supabase: SupabaseClient,
  _userId: string,
  _id: string,
): Promise<string | null> => {
  throw new FeatureUnavailableError('Attachments');
};

export const removeAttachment = async (
  _supabase: SupabaseClient,
  _userId: string,
  _id: string,
): Promise<void> => {
  throw new FeatureUnavailableError('Attachments');
};

/** Tải ảnh từ máy chủ về máy để lần sau xem được khi không có mạng. */
export const cacheRemoteAttachment = async (
  _supabase: SupabaseClient,
  _userId: string,
  _id: string,
): Promise<Blob | null> => {
  throw new FeatureUnavailableError('Attachments');
};
