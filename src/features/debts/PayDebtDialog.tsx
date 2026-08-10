import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { transactionTotals } from '@/core/calc';
import type { DebtSide } from '@/core/debtSelectors';
import { formatDate, formatVnd } from '@/core/format';
import { parseNumber } from '@/core/parseNumber';
import type { Transaction } from '@/core/types';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';

interface PayDebtDialogProps {
  readonly tx: Transaction | null;
  readonly side: DebtSide;
  readonly onConfirm: (tx: Transaction, amount: number) => void;
  readonly onCancel: () => void;
}

/**
 * Trả một phần. Ô nhập dùng `<NumberField>` nên trên điện thoại mở đúng bàn
 * phím số như màn tạo phiếu — hai chỗ ghi tiền mà gõ hai kiểu là cách nhanh
 * nhất để người dùng gõ sai một con số 0.
 */
export function PayDebtDialog({ tx, side, onConfirm, onCancel }: PayDebtDialogProps) {
  const [amount, setAmount] = useState('');

  if (!tx) return null;

  const { debt } = transactionTotals(tx);
  const paying = Math.min(parseNumber(amount), debt);
  const title = side === 'payable' ? L.payPart : L.collectPart;

  const submit = () => {
    onConfirm(tx, paying);
    setAmount('');
  };

  return (
    <Dialog
      open
      title={title}
      description={`${tx.supplierName} · ${formatDate(tx.date)}`}
      onClose={onCancel}
    >
      <div className="flex flex-col gap-3">
        <p className="num text-sm text-ink-2">
          {L.debtOf}: <span className="font-bold text-ink">{formatVnd(debt)}</span>
        </p>

        <NumberField label={L.amountPaidNow} value={amount} spoken autoFocus onValueChange={setAmount} />

        <p className="num text-sm text-ink-2">
          {L.remainingDebt}:{' '}
          <span className="font-bold text-payable">{formatVnd(debt - paying)}</span>
        </p>

        <Button tone="primary" size="lg" block disabled={paying <= 0} onClick={submit}>
          {L.confirm}
        </Button>
      </div>
    </Dialog>
  );
}
