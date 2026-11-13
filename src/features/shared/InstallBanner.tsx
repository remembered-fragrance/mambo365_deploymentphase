import { useOnceFlag } from '@/data/hooks/useOnceFlag';
import { CloseIcon, DownloadIcon } from '@/components/ui/icons';
import { L } from '@/i18n/labels';
import { promptInstall, useInstallAvailable } from './installPrompt';

/**
 * Mời cài app lên màn hình chính — chỉ khi trình duyệt cho cài, và chỉ ở Trang chủ (đang cân hàng thì không chen
 * vào). "Để sau" là thôi hẳn trên máy này; muốn cài vẫn vào menu trình duyệt được.
 */
export function InstallBanner() {
  const available = useInstallAvailable();
  const { done, markDone } = useOnceFlag('install-card');

  if (!available || done) return null;

  return (
    <div role="status" className="no-print flex items-center gap-2 border-b border-rule bg-card px-4 py-2">
      <DownloadIcon className="h-5 w-5 shrink-0 text-brand" />
      <p className="flex-1 text-sm text-ink-2">{L.installHint}</p>
      <button
        type="button"
        onClick={() => void promptInstall()}
        className="min-h-11 rounded-lg bg-brand px-3 text-sm font-bold text-paper"
      >
        {L.installAction}
      </button>
      <button
        type="button"
        onClick={markDone}
        aria-label={L.installLater}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-3"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
