import { L } from '@/i18n/labels';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { WarningIcon } from './icons';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  /** Hậu quả nói bằng SỐ: "Xoá phiếu 12.500.000₫ của Cô Mai ngày 08/08?" */
  readonly consequence: string;
  readonly confirmLabel?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  consequence,
  confirmLabel = L.confirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <p className="flex items-start gap-2 text-base text-ink-2">
        <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
        {consequence}
      </p>
      {/* Nút xác nhận KHÔNG đặt cạnh nút huỷ theo hướng tay quen bấm:
          huỷ nằm trái, xác nhận nằm phải và cách một khoảng rõ rệt. */}
      <div className="mt-5 flex gap-3">
        <Button tone="quiet" block onClick={onCancel}>
          {L.cancel}
        </Button>
        <Button tone="danger" block onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
