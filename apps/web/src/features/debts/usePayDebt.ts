/**
 * Ghi một lần trả nợ kèm 8 giây hoàn tác.
 *
 * Đây là thao tác lặp lại nhiều lần mỗi ngày nên KHÔNG dùng hộp thoại xác nhận
 * (§4.5): một chạm là xong, sai thì bấm "Hoàn tác". Hoàn tác bỏ đúng khoản vừa
 * ghi — `recordPayment` trả về khoản đó, không đi đoán "khoản cuối cùng".
 */

import { useToast } from '@/components/ui/Toast';
import { formatVnd } from '@/core/format';
import type { Transaction } from '@/core/types';
import type { DebtSide } from '@/core/debtSelectors';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

export type PayDebt = (tx: Transaction, amount: number) => void;

export function usePayDebt(side: DebtSide): PayDebt {
  const { recordPayment, removePayment } = useStore();
  const toast = useToast();

  return (tx, amount) => {
    const payment = recordPayment(tx.id, amount);
    if (!payment) return;

    toast({
      message: `${side === 'payable' ? L.paidToast : L.collectedToast} ${formatVnd(payment.amount)} · ${tx.supplierName}`,
      undoLabel: L.undo,
      onUndo: () => removePayment(tx.id, payment.id),
    });
  };
}
