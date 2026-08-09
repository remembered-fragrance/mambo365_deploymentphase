import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { formatVnd } from '@/core/format';
import { parseNumber } from '@/core/parseNumber';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';

interface PayPartDialogProps {
  readonly open: boolean;
  readonly total: number;
  readonly onConfirm: (amountPaid: number) => void;
  readonly onCancel: () => void;
}

/** "Ghi nợ & xong" — mở đúng một ô, mặc định để trống nghĩa là chưa trả đồng nào. */
export function PayPartDialog({ open, total, onConfirm, onCancel }: PayPartDialogProps) {
  const [amount, setAmount] = useState('');
  const paid = Math.min(parseNumber(amount), total);

  return (
    <Dialog open={open} title={L.payPartAndFinish} onClose={onCancel}>
      <div className="flex flex-col gap-3">
        <p className="num text-sm text-ink-2">
          {L.total}: <span className="font-bold text-ink">{formatVnd(total)}</span>
        </p>

        <NumberField label={L.amountPaidNow} value={amount} spoken autoFocus onValueChange={setAmount} />

        <p className="num text-sm text-ink-2">
          {L.remainingDebt}: <span className="font-bold text-payable">{formatVnd(total - paid)}</span>
        </p>

        <Button tone="primary" size="lg" block onClick={() => onConfirm(paid)}>
          {L.confirm}
        </Button>
      </div>
    </Dialog>
  );
}
