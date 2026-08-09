import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { MoreIcon, PrintIcon, ShareIcon, TrashIcon } from '@/components/ui/icons';
import { transactionTotals } from '@/core/calc';
import { formatDate, formatVnd } from '@/core/format';
import { receiptShareText } from '@/core/receiptText';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { ReceiptVoucher } from './ReceiptVoucher';

export function ReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, user, deleteTransaction } = useStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const tx = data.transactions.find((t) => t.id === id);

  if (!tx) {
    return (
      <PageContainer width="form">
        <EmptyState title={L.notFoundTitle} icon="🧭" />
      </PageContainer>
    );
  }

  const { total } = transactionTotals(tx);

  const share = async () => {
    const { shareText } = await import('@/export/downloadFile');
    await shareText(receiptShareText(tx), L.purchaseReceipt);
  };

  const remove = () => {
    setConfirmOpen(false);
    deleteTransaction(tx.id);
    toast({ message: `${L.del}: ${tx.supplierName}`, tone: 'alert' });
    navigate(ROUTES.receipts);
  };

  return (
    <PageContainer width="form">
      <PageHeader
        title={tx.kind === 'sale' ? L.saleReceipt : L.purchaseReceipt}
        subtitle={`${tx.supplierName} · ${formatDate(tx.date)}`}
        actions={
          <>
            <Button tone="primary" onClick={share}>
              <ShareIcon className="h-4 w-4" />
              {L.sendZalo}
            </Button>
            <Button onClick={() => window.print()}>
              <PrintIcon className="h-4 w-4" />
              {L.print}
            </Button>
            {/* Xoá nằm trong menu "⋯", không đặt cạnh nút xác nhận: tay đeo găng
                chạm nhầm là chuyện chắc chắn xảy ra. */}
            <Button aria-label={L.navMore} onClick={() => setMenuOpen((v) => !v)}>
              <MoreIcon className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {menuOpen && (
        <div className="mb-3 flex justify-end">
          <Button tone="danger" onClick={() => setConfirmOpen(true)}>
            <TrashIcon className="h-4 w-4" />
            {L.del}
          </Button>
        </div>
      )}

      <ReceiptVoucher tx={tx} businessName={user?.businessName || L.businessNameFallback} />

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
