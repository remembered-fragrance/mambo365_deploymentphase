/**
 * Một hook che hai nguồn ảnh: trong máy trước, không có thì xin máy chủ.
 *
 * Hook TỰ THU HỒI `URL.createObjectURL` khi rời màn hình. Bản demo có hai chỗ
 * xử lý khác nhau và một chỗ rò rỉ bộ nhớ — chỉ có đúng một chỗ ở đây.
 */

import { useEffect, useState } from 'react';
import { fetchRemoteAttachment, getLocalAttachment } from '../attachments';
import { useStore } from '../useStore';

export type AttachmentStatus = 'loading' | 'ready' | 'missing' | 'unavailable';

export interface AttachmentUrl {
  readonly url: string | null;
  readonly status: AttachmentStatus;
}

export function useAttachmentUrl(id: string | undefined): AttachmentUrl {
  const { currentOrgId } = useStore();
  const [state, setState] = useState<AttachmentUrl>({ url: null, status: 'loading' });

  useEffect(() => {
    if (!id) {
      setState({ url: null, status: 'missing' });
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const show = (blob: Blob): void => {
      objectUrl = URL.createObjectURL(blob);
      setState({ url: objectUrl, status: 'ready' });
    };

    const load = async (): Promise<void> => {
      const local = await getLocalAttachment(id);
      if (cancelled) return;
      if (local) {
        show(local);
        return;
      }

      if (!currentOrgId) {
        setState({ url: null, status: 'missing' });
        return;
      }

      // Tải hẳn về máy để lần sau xem được cả khi mất mạng; không tải được thì dùng URL có hạn.
      const remote = await fetchRemoteAttachment(currentOrgId, id);
      if (cancelled) return;
      if (remote instanceof Blob) show(remote);
      else setState(remote ? { url: remote, status: 'ready' } : { url: null, status: 'missing' });
    };

    setState({ url: null, status: 'loading' });
    void load().catch(() => {
      if (!cancelled) setState({ url: null, status: 'unavailable' });
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, currentOrgId]);

  return state;
}
