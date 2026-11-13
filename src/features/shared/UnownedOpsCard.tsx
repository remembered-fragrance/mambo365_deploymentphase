import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { WarningIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { droppedLines } from './syncNoticeText';

/**
 * B8: thay đổi ghi bằng bản app trước khi op mang người ghi. Máy dùng chung thì không biết của ai, nên app không
 * tự gửi (gửi bằng phiên người khác là ghi tên người khác lên phiếu). Liệt kê từng phiếu để người dùng nhận ra.
 */
export function UnownedOpsCard() {
  const { unowned, claimUnowned } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (unowned.length === 0) return null;

  const claim = () => {
    setBusy(true);
    claimUnowned()
      .catch((error: unknown) => {
        toast({ message: error instanceof Error ? error.message : L.localSaveFailed, tone: 'alert' });
      })
      .finally(() => setBusy(false));
  };

  return (
    <div role="alert" className="no-print border-b border-rule bg-card px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-alert">
        <WarningIcon className="h-4 w-4 shrink-0" />
        <span><span className="num">{unowned.length}</span> {L.unownedTitle}</span>
      </p>
      <ul className="mt-2 list-disc pl-6 text-ink">
        {droppedLines(unowned).map((line, index) => (
          <li key={index} className="num">{line}</li>
        ))}
      </ul>
      <p className="mt-2 text-ink-2">{L.unownedBody}</p>
      <Button className="mt-2" disabled={busy} onClick={claim}>{L.unownedClaim}</Button>
    </div>
  );
}
