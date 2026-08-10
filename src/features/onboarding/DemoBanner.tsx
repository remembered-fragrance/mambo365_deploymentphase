import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { WarningIcon } from '@/components/ui/icons';
import { useDemoMode } from '@/data/hooks/useDemoMode';
import { L } from '@/i18n/labels';

/**
 * 🔴 Banner này là điều kiện để chế độ trình diễn tồn tại.
 *
 * Lỗi chặn L1 sinh ra vì bản demo gieo dữ liệu mẫu vào sổ mà không nói gì.
 * Dữ liệu mẫu được phép quay lại, nhưng chỉ khi người dùng luôn nhìn thấy nó
 * là dữ liệu mẫu và luôn có một nút để xoá sạch.
 */
export function DemoBanner() {
  const { demo, endDemo } = useDemoMode();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  if (!demo) return null;

  return (
    <>
      <div
        role="status"
        className="no-print flex flex-wrap items-center gap-2 border-b border-alert bg-card px-4 py-2"
      >
        <WarningIcon className="h-5 w-5 shrink-0 text-alert" />
        <p className="flex-1 text-sm font-semibold text-alert">{L.demoBanner}</p>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="min-h-11 rounded-lg border border-alert px-3 text-sm font-bold text-alert"
        >
          {L.demoClear}
        </button>
      </div>

      <ConfirmDialog
        open={confirm}
        title={L.demoClearTitle}
        consequence={L.demoClearConsequence}
        confirmLabel={L.demoClear}
        onConfirm={() => {
          setConfirm(false);
          endDemo();
          toast({ message: L.demoEnded, tone: 'alert' });
        }}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
