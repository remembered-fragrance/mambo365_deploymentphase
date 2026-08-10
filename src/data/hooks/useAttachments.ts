/**
 * Thêm và bỏ ảnh phiếu cân / hoá đơn.
 *
 * Ảnh nén rồi mới lưu, và LUÔN lưu vào máy trước — chụp ảnh giữa rẫy không có
 * sóng vẫn phải xong việc. Việc đẩy lên máy chủ là chuyện của vòng đồng bộ.
 *
 * `features/` không được chạm `data/attachments` hay `data/compressImage` trực
 * tiếp (luật ranh giới), nên hai việc đó gói trong hook này.
 */

import { useCallback } from 'react';
import { MAX_ATTACHMENTS } from '@/config';
import { newId } from '@/core/id';
import { deleteLocalAttachment, putLocalAttachment } from '../attachments';
import { compressImage } from '../compressImage';

export interface Attachments {
  /** Trả về id ảnh vừa lưu, hoặc null khi phiếu đã đủ số ảnh cho phép. */
  readonly addPhoto: (file: File, current: readonly string[]) => Promise<string | null>;
  readonly removePhoto: (id: string) => Promise<void>;
  readonly maxPhotos: number;
}

export function useAttachments(): Attachments {
  const addPhoto = useCallback(async (file: File, current: readonly string[]) => {
    if (current.length >= MAX_ATTACHMENTS) return null;
    const id = newId();
    await putLocalAttachment(id, await compressImage(file));
    return id;
  }, []);

  const removePhoto = useCallback(async (id: string) => {
    await deleteLocalAttachment(id);
  }, []);

  return { addPhoto, removePhoto, maxPhotos: MAX_ATTACHMENTS };
}
