import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { transactionTotals } from '@mambo/core/calc';
import { needsCashReminder } from '@mambo/core/cashReminder';
import type { DebtSide } from '@mambo/core/debtSelectors';
import { formatDate, formatVnd } from '@mambo/core/format';
import type { PaymentMethod, Transaction } from '@mambo/core/types';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { parseMoney } from '../shared/money';
import { NumberField } from '../shared/NumberField';
import { copyTransferContent, PAY_METHOD_OPTIONS, transferContent } from '../shared/payMethod';

interface PayDebtDialogProps {
  readonly tx: Transaction | null;
  readonly side: DebtSide;
  /** Gói Pro trả nông hộ (`pay:qr`, chỉ bên phải trả): chọn hình thức trả, nhắc tiền mặt từ 5 triệu/ngày. */
  readonly withMethod?: boolean;
  /** Mở sẵn số tiền / hình thức — từ "Trả hết" vừa bị nhắc tiền mặt. */
  readonly preset?: { readonly amount: number; readonly method: PaymentMethod };
  readonly onConfirm: (tx: Transaction, amount: number, method?: PaymentMethod) => void;
  readonly onCancel: () => void;
}

/**
 * Trả một phần. Ô nhập dùng `<NumberField>` nên trên điện thoại mở đúng bàn
 * phím số như màn tạo phiếu — hai chỗ ghi tiền mà gõ hai kiểu là cách nhanh
 * nhất để người dùng gõ sai một con số 0.
 */
export function PayDebtDialog({ tx, side, withMethod = false, preset, onConfirm, onCancel }: PayDebtDialogProps) {
  const { data } = useStore();
  const toast = useToast();
  const [amount, setAmount] = useState(preset ? String(preset.amount) : '');
  const [method, setMethod] = useState<PaymentMethod>(preset?.method ?? 'cash');

  if (!tx) return null;

  const { debt } = transactionTotals(tx);
  const paying = Math.min(parseMoney(amount), debt);
  const title = side === 'payable' ? L.payPart : L.collectPart;
  const remind = withMethod && needsCashReminder(data, tx.counterpartyId, paying, method);

  const submit = () => {
    onConfirm(tx, paying, withMethod ? method : undefined);
    setAmount('');
    setMethod('cash');
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

        <NumberField label={L.amountPaidNow} value={amount} spoken money autoFocus onValueChange={setAmount} />

        {withMethod && (
          <Segmented
            label={L.payMethod}
            value={method}
            options={PAY_METHOD_OPTIONS}
            onValueChange={(v) => setMethod(v as PaymentMethod)}
          />
        )}
        {withMethod && method === 'transfer' && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rule bg-card p-3">
            <p className="text-sm text-ink-2">
              {L.transferContentLabel}: <span className="num font-bold text-ink">{transferContent(tx.id)}</span>
            </p>
            <Button onClick={() => void copyTransferContent(tx.id).then((message) => toast({ message }))}>
              {L.copyTransfer}
            </Button>
          </div>
        )}
        {remind && (
          <div className="flex flex-col gap-2 rounded-xl border border-alert bg-card p-3">
            <p className="text-sm font-semibold text-ink">{L.cashReminderTitle}</p>
            <p className="text-sm text-ink-2">{L.cashReminderBody}</p>
            <Button onClick={() => setMethod('transfer')}>{L.cashReminderUseTransfer}</Button>
          </div>
        )}

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
