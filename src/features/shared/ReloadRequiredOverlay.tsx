import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { WarningIcon } from '@/components/ui/icons';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { downloadBook } from './bookFile';

const BODY = { idle: L.reloadIdleBody, saved: L.reloadSavedBody, unsaved: L.reloadUnsavedBody } as const;

/**
 * B7: tab khác vừa mở bản app mới, tab này không ghi xuống máy được nữa. Chặn cả màn hình — ghi tiếp ở đây chỉ
 * thêm thứ phải cứu. Phiếu vẫn trong bộ nhớ (chưa tải lại) nên lúc cứu hỏng vẫn còn lưu ra file được.
 */
export function ReloadRequiredOverlay() {
  const { reloadRequired, data } = useStore();
  if (!reloadRequired) return null;

  return createPortal(
    <div className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4">
      <div role="alertdialog" aria-modal="true" aria-label={L.reloadTitle} className="card w-full max-w-md p-5 shadow-xl">
        <p className="flex items-center gap-2 text-lg font-semibold text-alert">
          <WarningIcon className="h-5 w-5 shrink-0" />
          {L.reloadTitle}
        </p>
        <p className="mt-2 text-ink-2">{BODY[reloadRequired]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {reloadRequired === 'unsaved' && <Button onClick={() => void downloadBook(data)}>{L.reloadSaveFile}</Button>}
          <Button tone="primary" onClick={() => window.location.reload()}>
            {reloadRequired === 'idle' ? L.reloadIdleNow : L.reloadNow}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
