import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { formatVnd } from '@/core/format';
import { parseNumber } from '@/core/parseNumber';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';

interface PayPartDialogProps {
  readonly open: boolean;
  readonly total: number;
  readonly onConfirm: (amountPaid: number, dueDate?: string) => void;
  readonly onCancel: () => void;
}

/**
 * "Ghi nợ & xong" — mở đúng một ô tiền, để trống nghĩa là chưa trả đồng nào.
 *
 * Ô hẹn ngày trả nằm ở ĐÂY chứ không nằm trong form phiếu: hẹn ngày chỉ có
 * nghĩa khi phiếu còn nợ, và đây đúng là giây phút khoản nợ hình thành.
 */
export function PayPartDialog({ open, total, onConfirm, onCancel }: PayPartDialogProps) {
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
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

        {paid < total && (
          <Input
            label={L.dueDate}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        )}

        <Button
          tone="primary"
          size="lg"
          block
          onClick={() => onConfirm(paid, dueDate || undefined)}
        >
          {L.confirm}
        </Button>
      </div>
    </Dialog>
  );
}
