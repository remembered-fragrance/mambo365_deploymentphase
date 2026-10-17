import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WarningIcon } from '@/components/ui/icons';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/** Thao tác bị máy chủ từ chối chặn cả hàng đợi — phải cho người dùng lối ra, không để kẹt im lặng. */
export function StuckBanner() {
  const { stuck, status, retryStuck, dropStuck } = useStore();
  const [confirmDrop, setConfirmDrop] = useState(false);
  if (!stuck) return null;

  return (
    <div role="alert" className="no-print flex flex-wrap items-center gap-2 border-b border-rule bg-card px-4 py-2 text-sm text-alert">
      <WarningIcon className="h-4 w-4 shrink-0" />
      <span className="font-semibold">{L.syncStuck}</span>
      {status.error && <span className="text-ink-3">{status.error}</span>}
      <span className="ml-auto flex gap-2">
        <Button onClick={retryStuck}>{L.syncStuckRetry}</Button>
        <Button tone="danger" onClick={() => setConfirmDrop(true)}>{L.syncStuckDrop}</Button>
      </span>
      <ConfirmDialog
        open={confirmDrop}
        title={L.syncStuckDropTitle}
        consequence={L.syncStuckDropConsequence}
        confirmLabel={L.syncStuckDrop}
        onConfirm={() => {
          setConfirmDrop(false);
          dropStuck();
        }}
        onCancel={() => setConfirmDrop(false)}
      />
    </div>
  );
}
