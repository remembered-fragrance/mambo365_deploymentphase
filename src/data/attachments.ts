/**
 * Ảnh phiếu cân / hoá đơn: IndexedDB & Storage (BE8 — Thumua365_BE docs/FRONTEND.md §5.11).
 *
 * Ảnh luôn được lưu vào máy TRƯỚC. Chụp ảnh giữa rẫy không có sóng vẫn phải
 * xong việc; đẩy lên là chuyện của lúc có mạng. Ảnh đi thẳng giữa app và
 * Storage — API chỉ ký URL, app không cầm khoá Storage nào.
 */

import { ApiError } from '@mambo/sdk';
import { apiForOrg } from './client';
import { openLocalDb } from './localDb';

export const putLocalAttachment = async (id: string, blob: Blob): Promise<void> => {
  const db = await openLocalDb();
  await db.put('attachments', blob, id);
};

export const getLocalAttachment = async (id: string): Promise<Blob | undefined> => {
  const db = await openLocalDb();
  return db.get('attachments', id);
};

/** Bỏ ảnh khỏi máy và khỏi hàng đợi. Ảnh đã lên máy chủ thì nằm đó — không có lệnh xoá ảnh. */
export const deleteLocalAttachment = async (id: string): Promise<void> => {
  const db = await openLocalDb();
  await db.delete('attachments', id);
  await db.delete('attachmentQueue', id);
};

export const queueAttachmentUpload = async (id: string, orgId: string): Promise<void> => {
  const db = await openLocalDb();
  await db.put('attachmentQueue', orgId, id);
};

/**
 * Đẩy ảnh đang chờ của tổ chức. 409 (đã lên từ lần trước) SDK coi là xong.
 * Mạng / máy chủ / phiên hỏng → dừng, giữ hàng đợi, lần đồng bộ sau thử lại.
 * Ảnh bị từ chối (sai loại, quá 3MB) hay không còn trong máy → bỏ khỏi hàng đợi, không để kẹt.
 */
export const flushAttachments = async (orgId: string): Promise<number> => {
  const db = await openLocalDb();
  const client = apiForOrg(orgId);
  let uploaded = 0;
  for (const id of await db.getAllKeys('attachmentQueue')) {
    if ((await db.get('attachmentQueue', id)) !== orgId) continue;
    const blob = await db.get('attachments', id);
    if (blob) {
      try {
        await client.attachments.upload(id, blob);
        uploaded++;
      } catch (err) {
        if (!(err instanceof ApiError && err.code === 'VALIDATION_FAILED')) return uploaded;
      }
    }
    await db.delete('attachmentQueue', id);
  }
  return uploaded;
};

/**
 * Xem ảnh ở máy khác: xin URL có hạn (10 phút) rồi tải về máy để lần sau xem được khi mất mạng.
 * Ảnh chưa lên máy chủ → null ("Ảnh ở máy khác, chưa có mạng"). Không tải được blob thì dùng thẳng URL.
 */
export const fetchRemoteAttachment = async (orgId: string, id: string): Promise<Blob | string | null> => {
  let url: string;
  try {
    url = (await apiForOrg(orgId).attachments.url(id)).url;
  } catch (err) {
    if (err instanceof ApiError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    await putLocalAttachment(id, blob);
    return blob;
  } catch {
    return url;
  }
};
