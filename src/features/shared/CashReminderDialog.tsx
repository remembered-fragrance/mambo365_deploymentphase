import { formatVnd } from '@mambo/core/format';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { WarningIcon } from '@/components/ui/icons';
import { L } from '@/i18n/labels';

interface Props {
  readonly open: boolean;
  /** Tiền mặt đã trả cho người này hôm nay, chưa tính lần đang trả. */
  readonly paidToday: number;
  readonly onTransfer: () => void;
  readonly onCash: () => void;
  readonly onCancel: () => void;
}

/**
 * Nhắc trước khi ghi tiền mặt từ 5 triệu đồng/ngày cho một người bán (V13, §4.2). Chỉ nhắc, không chặn:
 * "Vẫn trả tiền mặt" ghi đúng như người dùng chọn.
 */
export function CashReminderDialog({ open, paidToday, onTransfer, onCash, onCancel }: Props) {
  return (
    <Dialog open={open} title={L.cashReminderTitle} onClose={onCancel}>
      <p className="flex items-start gap-2 text-base text-ink-2">
        <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
        {L.cashReminderBody}
      </p>
      {paidToday > 0 && (
        <p className="num mt-3 text-sm text-ink-2">
          {L.cashReminderToday}: <span className="font-bold text-ink">{formatVnd(paidToday)}</span>
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button block onClick={onCash}>
          {L.cashReminderKeepCash}
        </Button>
        <Button tone="primary" block onClick={onTransfer}>
          {L.cashReminderUseTransfer}
        </Button>
      </div>
    </Dialog>
  );
}
