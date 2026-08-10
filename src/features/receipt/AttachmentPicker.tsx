import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { CameraIcon, TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { useAttachmentUrl } from '@/data/hooks/useAttachmentUrl';
import { useAttachments } from '@/data/hooks/useAttachments';
import { L } from '@/i18n/labels';

interface AttachmentPickerProps {
  readonly ids: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
}

function Thumbnail({ id, onRemove }: { readonly id: string; readonly onRemove: () => void }) {
  const { url, status } = useAttachmentUrl(id);

  return (
    <li className="relative">
      <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-rule bg-paper">
        {status === 'ready' && url ? (
          <img src={url} alt={L.attachments} className="h-full w-full object-cover" />
        ) : (
          <CameraIcon className="h-6 w-6 text-ink-3" />
        )}
      </span>
      <button
        type="button"
        aria-label={L.removePhoto}
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-card text-alert"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

/**
 * Ảnh phiếu cân / hoá đơn.
 *
 * Tầng dữ liệu đã có đủ từ giai đoạn C (lưu máy, đẩy lên, đường dẫn có chữ ký)
 * nhưng chưa màn nào gọi tới — đây là chỗ gọi.
 */
export function AttachmentPicker({ ids, onChange }: AttachmentPickerProps) {
  const { addPhoto, removePhoto, maxPhotos } = useAttachments();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const id = await addPhoto(file, ids);
    if (!id) {
      toast({ message: L.photoFull, tone: 'alert' });
      return;
    }
    onChange([...ids, id]);
  };

  const drop = async (id: string) => {
    onChange(ids.filter((x) => x !== id));
    await removePhoto(id);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-ink">{L.attachments}</p>

      {ids.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {ids.map((id) => (
            <Thumbnail key={id} id={id} onRemove={() => void drop(id)} />
          ))}
        </ul>
      )}

      <Button block disabled={ids.length >= maxPhotos} onClick={() => input.current?.click()}>
        <CameraIcon className="h-4 w-4" />
        {L.addPhoto}
      </Button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={L.addPhoto}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
