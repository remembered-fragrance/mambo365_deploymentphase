/**
 * Một hook che hai nguồn ảnh: trong máy trước, không có thì xin máy chủ.
 *
 * Hook TỰ THU HỒI `URL.createObjectURL` khi rời màn hình. Bản demo có hai chỗ
 * xử lý khác nhau và một chỗ rò rỉ bộ nhớ — chỉ có đúng một chỗ ở đây.
 */

import { useEffect, useState } from 'react';
import { getSupabase } from '../client';
import { cacheRemoteAttachment, getLocalAttachment, signedAttachmentUrl } from '../attachments';
import { useStore } from '../useStore';

export type AttachmentStatus = 'loading' | 'ready' | 'missing';

export interface AttachmentUrl {
  readonly url: string | null;
  readonly status: AttachmentStatus;
}

export function useAttachmentUrl(id: string | undefined): AttachmentUrl {
  const { user } = useStore();
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

      const supabase = getSupabase();
      if (!supabase || !user) {
        setState({ url: null, status: 'missing' });
        return;
      }

      // Tải hẳn về máy để lần sau xem được cả khi mất mạng.
      const remote = await cacheRemoteAttachment(supabase, user.id, id);
      if (cancelled) return;
      if (remote) {
        show(remote);
        return;
      }

      const signed = await signedAttachmentUrl(supabase, user.id, id);
      if (cancelled) return;
      setState(signed ? { url: signed, status: 'ready' } : { url: null, status: 'missing' });
    };

    setState({ url: null, status: 'loading' });
    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, user]);

  return state;
}
