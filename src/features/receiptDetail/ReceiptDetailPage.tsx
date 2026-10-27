import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { MoreIcon, PrintIcon, ShareIcon, TrashIcon } from '@/components/ui/icons';
import { transactionTotals } from '@mambo/core/calc';
import { cashPaidOnDay, needsCashReminder } from '@mambo/core/cashReminder';
import type { DebtSide } from '@mambo/core/debtSelectors';
import { formatDate, formatVnd } from '@mambo/core/format';
import { receiptShareText } from '@mambo/core/receiptText';
import type { PaymentMethod } from '@mambo/core/types';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { PayDebtDialog } from '../debts/PayDebtDialog';
import { usePayDebt } from '../debts/usePayDebt';
import { CashReminderDialog } from '../shared/CashReminderDialog';
import { ROUTES } from '../shared/navItems';
import { useAccess } from '../shared/useAccess';
import { useAttempt } from '../shared/useAttempt';
import { ReceiptVoucher } from './ReceiptVoucher';

export function ReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const attempt = useAttempt();
  const { data, user, deleteTransaction } = useStore();
  const { can } = useAccess();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Hộp "Trả một phần": `preset` khi vừa chọn chuyển khoản ở hộp nhắc tiền mặt.
  const [payingPart, setPayingPart] = useState<{ readonly preset?: { amount: number; method: PaymentMethod } } | null>(null);
  const [cashAsk, setCashAsk] = useState<number | null>(null);
  const payQr = useEntitlement('pay:qr');

  const tx = data.transactions.find((t) => t.id === id);
  const side: DebtSide = tx?.kind === 'sale' ? 'receivable' : 'payable';
  const pay = usePayDebt(side);
  // Như màn Công nợ: gói Pro trả nông hộ thì ghi hình thức trả, nhắc tiền mặt từ 5 triệu/ngày.
  const withMethod = payQr && side === 'payable';

  if (!tx) {
    return (
      <PageContainer width="form">
        <EmptyState title={L.notFoundTitle} icon="🧭" />
      </PageContainer>
    );
  }

  const { total, debt } = transactionTotals(tx);
  const title = tx.kind === 'sale' ? L.saleReceipt : L.purchaseReceipt;
  const fileName = `thumua365-phieu-${tx.id.slice(0, 8)}`;

  const payFull = () => {
    if (!withMethod) return pay(tx, debt);
    if (needsCashReminder(data, tx.counterpartyId, debt, 'cash')) return setCashAsk(debt);
    return pay(tx, debt, 'cash');
  };

  /** Mọi đường gửi phiếu đi: huỷ bảng chia sẻ thì thôi; chép vào clipboard thì phải nói, không thì bấm như không có gì xảy ra. */
  const send = async (run: () => Promise<string>) => {
    try {
      if ((await run()) === 'copied') toast({ message: L.receiptCopied });
    } catch {
      toast({ message: L.shareFailed, tone: 'alert' });
    }
  };

  const shareText = () =>
    send(async () => (await import('@/export/downloadFile')).shareText(receiptShareText(tx), title));
  const shareImage = () =>
    send(async () => (await import('@/export/receiptFile')).shareReceiptPng(tx, `${fileName}.png`));
  const sharePdf = () =>
    send(async () => (await import('@/export/receiptFile')).shareReceiptPdf(tx, `${fileName}.pdf`));

  const remove = () => {
    setConfirmOpen(false);
    if (!attempt(() => deleteTransaction(tx.id))) return;
    toast({ message: `${L.del}: ${tx.supplierName}`, tone: 'alert' });
    navigate(ROUTES.receipts);
  };

  return (
    <PageContainer width="form">
      <PageHeader
        title={title}
        subtitle={`${tx.supplierName} · ${formatDate(tx.date)}`}
        actions={
          <>
            <Button tone="primary" onClick={() => void shareText()}>
              <ShareIcon className="h-4 w-4" />
              {L.sendZalo}
            </Button>
            <Button onClick={() => window.print()}>
              <PrintIcon className="h-4 w-4" />
              {L.print}
            </Button>
            <Button aria-label={L.navMore} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <MoreIcon className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {menuOpen && (
        <div className="no-print mb-3 flex flex-wrap justify-end gap-2">
          <Button onClick={() => void shareImage()}>{L.sendImage}</Button>
          <Button onClick={() => void sharePdf()}>{L.savePdf}</Button>
          {/* Xoá nằm trong menu "⋯", không đặt cạnh nút xác nhận: tay đeo găng
              chạm nhầm là chuyện chắc chắn xảy ra. */}
          {can('receipt:delete') && (
            <Button tone="danger" onClick={() => setConfirmOpen(true)}>
              <TrashIcon className="h-4 w-4" />
              {L.del}
            </Button>
          )}
        </div>
      )}

      {/* Phiếu còn nợ: trả ngay tại đây, khỏi sang Công nợ tìm lại đúng người. */}
      {debt > 0 && can('payment:record') && (
        <div className="no-print card mb-3 flex flex-wrap items-center gap-2 p-3">
          <p className="num min-w-0 flex-1 text-sm text-ink-2">
            {side === 'payable' ? L.remainingDebt : L.remainingReceivable}:{' '}
            <span className="font-bold text-payable">{formatVnd(debt)}</span>
          </p>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => setPayingPart({})}>{side === 'payable' ? L.payPart : L.collectPart}</Button>
            <Button tone="primary" onClick={payFull}>
              {side === 'payable' ? L.payFull : L.collectFull}
            </Button>
          </div>
        </div>
      )}

      <ReceiptVoucher tx={tx} businessName={user?.businessName || L.businessNameFallback} />

      <PayDebtDialog
        // Mở lại là dựng mới: số tiền / hình thức đặt sẵn chỉ đọc lúc dựng.
        key={payingPart?.preset?.method ?? 'none'}
        tx={payingPart ? tx : null}
        side={side}
        withMethod={withMethod}
        preset={payingPart?.preset}
        onConfirm={(t, amount, method) => {
          setPayingPart(null);
          pay(t, amount, method);
        }}
        onCancel={() => setPayingPart(null)}
      />

      <CashReminderDialog
        open={cashAsk !== null}
        paidToday={cashAsk !== null ? cashPaidOnDay(data, tx.counterpartyId, new Date()) : 0}
        onTransfer={() => {
          if (cashAsk !== null) setPayingPart({ preset: { amount: cashAsk, method: 'transfer' } });
          setCashAsk(null);
        }}
        onCash={() => {
          if (cashAsk !== null) pay(tx, cashAsk, 'cash');
          setCashAsk(null);
        }}
        onCancel={() => setCashAsk(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={L.deleteReceiptTitle}
        consequence={`${L.del} ${formatVnd(total)} · ${tx.supplierName} · ${formatDate(tx.date)}`}
        confirmLabel={L.del}
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageContainer>
  );
}
