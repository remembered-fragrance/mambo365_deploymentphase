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

export const queueAttachmentUpload = async (id: string, orgId: string, userId: string): Promise<void> => {
  const db = await openLocalDb();
  await db.put('attachmentQueue', { orgId, userId, tries: 0 }, id);
};

/**
 * Một ảnh chờ đẩy. Bản trước 0.20 lưu thẳng chuỗi `orgId` — vẫn đọc được, coi như chưa thử lần nào.
 * `tries`: số lần máy chủ (Storage) trả lỗi tạm cho ảnh này; mất mạng không tính.
 * `userId`: người chụp (B8) — dọn sổ của một người không được xoá ảnh chưa gửi của người khác dùng chung máy.
 * Thiếu (bản trước 0.20) là chưa biết của ai: giữ lại, ai đồng bộ tổ chức đó trước thì đẩy lên.
 */
export type AttachmentQueueEntry = string | { readonly orgId: string; readonly tries: number; readonly userId?: string };

export const queuedOrgOf = (entry: AttachmentQueueEntry | undefined): string | undefined =>
  typeof entry === 'string' ? entry : entry?.orgId;

const ownerOf = (entry: AttachmentQueueEntry): string | undefined => (typeof entry === 'string' ? undefined : entry.userId);

/** Ảnh `userId` chụp ở `orgId` mà chưa lên máy chủ — đăng xuất rồi dọn là mất hẳn, nên phải hỏi trước. */
export const queuedPhotoCount = async (orgId: string, userId: string): Promise<number> => {
  const db = await openLocalDb();
  let count = 0;
  for (const id of await db.getAllKeys('attachmentQueue')) {
    const entry = await db.get('attachmentQueue', id);
    if (entry !== undefined && queuedOrgOf(entry) === orgId && ownerOf(entry) === userId) count++;
  }
  return count;
};

/**
 * Bỏ ảnh của một tổ chức khỏi máy khi dọn sổ của `userId`: ảnh trong sổ (đã lên máy chủ, mở lại tải về được) và
 * ảnh chờ đẩy do chính người này chụp. Ảnh chờ đẩy của người khác, hay chưa rõ người chụp, giữ nguyên — chưa lên
 * máy chủ thì đó là bản duy nhất. `orgGone`: tổ chức đã xoá hẳn trên máy chủ, không ảnh nào còn chỗ để lên.
 */
export const wipeOrgPhotos = async (
  orgId: string,
  userId: string | null,
  bookPhotos: readonly string[],
  orgGone = false,
): Promise<void> => {
  const db = await openLocalDb();
  const candidates = new Set(bookPhotos);
  for (const id of await db.getAllKeys('attachmentQueue')) {
    if (queuedOrgOf(await db.get('attachmentQueue', id)) === orgId) candidates.add(id);
  }
  for (const id of candidates) {
    const entry = await db.get('attachmentQueue', id);
    const keep = !orgGone && entry !== undefined && (userId === null || ownerOf(entry) !== userId);
    if (!keep) await deleteLocalAttachment(id);
  }
};

const triesOf = (entry: AttachmentQueueEntry): number => (typeof entry === 'string' ? 0 : entry.tries);

/** Sau ngần này lần máy chủ trả lỗi tạm thì báo người dùng — ảnh vẫn giữ, vẫn thử tiếp. */
export const MAX_PHOTO_TRIES = 5;

/**
 * Ảnh cần báo người dùng (B6). `rejected`: máy chủ không bao giờ nhận (quá lớn, sai loại) — đã bỏ khỏi hàng
 * đợi, ảnh chỉ còn trên máy này. `stalled`: thử `MAX_PHOTO_TRIES` lần vẫn lỗi — ảnh còn trong hàng đợi.
 */
export interface PhotoAlert {
  readonly id: string;
  readonly reason: 'rejected' | 'stalled';
}

export interface PhotoFlush {
  readonly uploaded: number;
  readonly alerts: readonly PhotoAlert[];
}

/** Chỉ hai lỗi này là của chính tấm ảnh: gửi lại bao nhiêu lần cũng bị từ chối. */
const isPermanent = (err: unknown): boolean =>
  err instanceof ApiError && (err.code === 'VALIDATION_FAILED' || err.code === 'PAYLOAD_TOO_LARGE');

/**
 * Đẩy ảnh đang chờ của tổ chức. 409 (đã lên từ lần trước) SDK coi là xong.
 *
 * - Mất mạng → dừng, giữ hàng đợi, không tính lần thử.
 * - Hết gói (`PLAN_REQUIRED`, 0.21.0) → như mất mạng: ảnh nằm chờ, gia hạn xong tự lên (như `PLAN_EXPIRED` ở sync).
 * - Máy chủ lỗi tạm (401/403/429/5xx — B6: trước đây mọi 4xx thành "sai dữ liệu" và ảnh bị bỏ, chỉ còn trên máy
 *   chụp) → giữ ảnh, cộng `tries`, dừng lượt này. Đủ `MAX_PHOTO_TRIES` lần thì báo người dùng một lần; từ đó ảnh
 *   này lỗi không chặn các ảnh sau nữa, nhưng vẫn được thử lại mỗi lượt.
 * - Bị từ chối hẳn (sai loại, quá 3MB) hay không còn trong máy → bỏ khỏi hàng đợi, không để kẹt; báo người dùng.
 */
export const flushAttachments = async (orgId: string): Promise<PhotoFlush> => {
  const db = await openLocalDb();
  const client = apiForOrg(orgId);
  let uploaded = 0;
  const alerts: PhotoAlert[] = [];
  for (const id of await db.getAllKeys('attachmentQueue')) {
    const entry = await db.get('attachmentQueue', id);
    if (entry === undefined || queuedOrgOf(entry) !== orgId) continue;
    const blob = await db.get('attachments', id);
    if (blob) {
      try {
        await client.attachments.upload(id, blob);
        uploaded++;
      } catch (err) {
        if (isPermanent(err)) {
          alerts.push({ id, reason: 'rejected' });
        } else {
          if (!(err instanceof ApiError) || err.code === 'PLAN_REQUIRED') return { uploaded, alerts };
          const tries = triesOf(entry) + 1;
          await db.put('attachmentQueue', typeof entry === 'string' ? { orgId, tries } : { ...entry, tries }, id);
          if (tries === MAX_PHOTO_TRIES) alerts.push({ id, reason: 'stalled' });
          if (tries < MAX_PHOTO_TRIES) return { uploaded, alerts };
          continue;
        }
      }
    }
    await db.delete('attachmentQueue', id);
  }
  return { uploaded, alerts };
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
