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
import { newId } from '@mambo/core/id';
import { deleteLocalAttachment, putLocalAttachment, queueAttachmentUpload } from '../attachments';
import { compressImage } from '../compressImage';
import { L } from '@/i18n/labels';
import { useStore } from '../useStore';

export interface Attachments {
  /** Trả về id ảnh vừa lưu, hoặc null khi phiếu đã đủ số ảnh cho phép. */
  readonly addPhoto: (file: File, current: readonly string[]) => Promise<string | null>;
  readonly removePhoto: (id: string) => Promise<void>;
  readonly maxPhotos: number;
}

export function useAttachments(): Attachments {
  const { currentOrgId, user } = useStore();
  const userId = user?.id;

  const addPhoto = useCallback(
    async (file: File, current: readonly string[]) => {
      if (current.length >= MAX_ATTACHMENTS) return null;
      const id = newId();
      await putLocalAttachment(id, await compressImage(file));
      // Sổ của máy này (chưa có tổ chức) không đẩy lên đâu cả — ảnh chỉ nằm trong máy. Sổ tổ chức thì ảnh phải
      // mang người chụp (B8); chưa biết là ai thì không nhận ảnh, không để ảnh nằm im không bao giờ được đẩy.
      if (currentOrgId) {
        if (!userId) {
          await deleteLocalAttachment(id);
          throw new Error(L.bookNotReady);
        }
        await queueAttachmentUpload(id, currentOrgId, userId);
      }
      return id;
    },
    [currentOrgId, userId],
  );

  const removePhoto = useCallback(async (id: string) => {
    await deleteLocalAttachment(id);
  }, []);

  return { addPhoto, removePhoto, maxPhotos: MAX_ATTACHMENTS };
}
