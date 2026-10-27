/**
 * Ghi một lần trả nợ kèm 8 giây hoàn tác.
 *
 * Đây là thao tác lặp lại nhiều lần mỗi ngày nên KHÔNG dùng hộp thoại xác nhận
 * (§4.5): một chạm là xong, sai thì bấm "Hoàn tác". Hoàn tác bỏ đúng khoản vừa
 * ghi — `recordPayment` trả về khoản đó, không đi đoán "khoản cuối cùng".
 *
 * Gói Pro ghi kèm hình thức trả (V13); trả bằng chuyển khoản thì chép sẵn nội dung `PM-…` để dán vào app ngân hàng.
 */

import { useToast } from '@/components/ui/Toast';
import { formatVnd } from '@mambo/core/format';
import type { PaymentMethod, Transaction } from '@mambo/core/types';
import type { DebtSide } from '@mambo/core/debtSelectors';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { useAccess } from '../shared/useAccess';
import { copyTransferContent } from '../shared/payMethod';
import { useAttempt } from '../shared/useAttempt';

export type PayDebt = (tx: Transaction, amount: number, method?: PaymentMethod) => void;

export function usePayDebt(side: DebtSide): PayDebt {
  const { recordPayment, removePayment } = useStore();
  const { can } = useAccess();
  const toast = useToast();
  const attempt = useAttempt();

  return async (tx, amount, method) => {
    const payment = attempt(() => recordPayment(tx.id, amount, method))?.value;
    if (!payment) return;
    const copied = method === 'transfer' ? ` · ${await copyTransferContent(tx.id)}` : '';

    toast({
      message: `${side === 'payable' ? L.paidToast : L.collectedToast} ${formatVnd(payment.amount)} · ${tx.supplierName}${copied}`,
      // Hoàn tác = huỷ lần trả (`payment:void`); người cân không có quyền này.
      ...(can('payment:void') ? { undoLabel: L.undo, onUndo: () => attempt(() => removePayment(tx.id, payment.id)) } : {}),
    });
  };
}
