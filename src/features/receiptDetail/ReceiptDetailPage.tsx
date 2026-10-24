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
import type { DebtSide } from '@mambo/core/debtSelectors';
import { formatDate, formatVnd } from '@mambo/core/format';
import { receiptShareText } from '@mambo/core/receiptText';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { PayDebtDialog } from '../debts/PayDebtDialog';
import { usePayDebt } from '../debts/usePayDebt';
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
  const [payingPart, setPayingPart] = useState(false);

  const tx = data.transactions.find((t) => t.id === id);
  const side: DebtSide = tx?.kind === 'sale' ? 'receivable' : 'payable';
  const pay = usePayDebt(side);

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
            <Button onClick={() => setPayingPart(true)}>{side === 'payable' ? L.payPart : L.collectPart}</Button>
            <Button tone="primary" onClick={() => pay(tx, debt)}>
              {side === 'payable' ? L.payFull : L.collectFull}
            </Button>
          </div>
        </div>
      )}

      <ReceiptVoucher tx={tx} businessName={user?.businessName || L.businessNameFallback} />

      <PayDebtDialog
        tx={payingPart ? tx : null}
        side={side}
        onConfirm={(t, amount) => {
          setPayingPart(false);
          pay(t, amount);
        }}
        onCancel={() => setPayingPart(false)}
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
