import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PlusIcon } from '@/components/ui/icons';
import { formatVnd } from '@/core/format';
import { newId } from '@/core/id';
import type { TransactionKind } from '@/core/types';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { FirstReceiptCoach } from '../onboarding/FirstReceiptCoach';
import { ROUTES } from '../shared/navItems';
import { CounterpartyPicker } from './CounterpartyPicker';
import { LineEditor } from './LineEditor';
import { MoreInfoPanel } from './MoreInfoPanel';
import { PayPartDialog } from './PayPartDialog';
import { ReceiptSummary } from './ReceiptSummary';
import { SessionRail } from './SessionRail';
import { useDraftReceipt } from './useDraftReceipt';

export function CreateReceiptPage() {
  const [params, setParams] = useSearchParams();
  const draftId = params.get('draft') ?? undefined;
  const kind: TransactionKind = params.get('kind') === 'sale' ? 'sale' : 'purchase';

  /**
   * Đổi khách là dựng lại toàn bộ trạng thái phiếu — `key` bảo React làm việc
   * đó, không phải tự đồng bộ tay từng ô rồi quên mất một ô.
   *
   * Khách chưa có nháp thì khoá lấy từ tham số `moi`: bấm "Khách mới" hai lần
   * liên tiếp vẫn phải ra hai phiếu trắng khác nhau, mà URL thì chưa có id nháp
   * để phân biệt.
   */
  const sessionKey = draftId ?? params.get('moi') ?? `moi-${kind}`;

  return (
    <ReceiptWorkspace key={sessionKey} draftId={draftId} kind={kind} setParams={setParams} />
  );
}

interface WorkspaceProps {
  readonly draftId?: string;
  readonly kind: TransactionKind;
  readonly setParams: (next: URLSearchParams) => void;
}

function ReceiptWorkspace({ draftId, kind, setParams }: WorkspaceProps) {
  const { data } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const receipt = useDraftReceipt(draftId, kind);
  const [payPartOpen, setPayPartOpen] = useState(false);

  const sessions = data.drafts.filter((d) => d.status === 'draft' && (d.kind ?? 'purchase') === kind);

  const goToDraft = (id?: string) => {
    const next = new URLSearchParams();
    next.set('kind', kind);
    if (id) next.set('draft', id);
    else next.set('moi', newId());
    setParams(next);
  };

  const finish = (amountPaid: number, dueDate?: string) => {
    const tx = receipt.finish(amountPaid, dueDate);
    if (!tx) return;
    setPayPartOpen(false);
    toast({ message: `${L.total}: ${formatVnd(amountPaid)} · ${tx.supplierName}` });
    // Quay về đúng thanh chip: còn khách đang cân thì mở khách kế, hết thì phiếu mới.
    const remaining = sessions.filter((d) => d.id !== receipt.draftId);
    goToDraft(remaining[0]?.id);
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title={kind === 'sale' ? L.createSale : L.createPurchase}
        actions={
          <>
            <HelpButton topic="create" />
            <Button onClick={() => navigate(ROUTES.receipts)}>{L.navReceipts}</Button>
          </>
        }
      />

      {/* Hướng dẫn bốn bước — chỉ hiện một lần, ngay trên màn hình nó nói về. */}
      <FirstReceiptCoach />

      <div className="mb-3 lg:hidden">
        <SessionRail
          drafts={sessions}
          activeId={receipt.draftId}
          onSelect={(id) => goToDraft(id)}
          onNewCustomer={() => goToDraft(undefined)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">
            {L.weighingNow}
          </p>
          <SessionRail
            drafts={sessions}
            activeId={receipt.draftId}
            onSelect={(id) => goToDraft(id)}
            onNewCustomer={() => goToDraft(undefined)}
          />
        </aside>

        <div className="flex flex-col gap-4 lg:col-span-6">
          <CounterpartyPicker
            data={data}
            kind={kind}
            name={receipt.partyName}
            counterpartyId={receipt.counterpartyId}
            onPick={receipt.setCounterparty}
          />

          {receipt.lines.map((line) => (
            <LineEditor
              key={line.id}
              line={line}
              products={data.products}
              canRemove={receipt.lines.length > 1}
              onChange={(patch) => receipt.updateLine(line.id, patch)}
              onRemove={() => receipt.removeLine(line.id)}
            />
          ))}

          <Button block onClick={receipt.addLine}>
            <PlusIcon className="h-4 w-4" />
            {L.addLine}
          </Button>

          <MoreInfoPanel
            adjustments={receipt.adjustments}
            note={receipt.note}
            attachmentIds={receipt.attachmentIds}
            onAdjustmentsChange={receipt.setAdjustments}
            onNoteChange={receipt.setNote}
            onAttachmentsChange={receipt.setAttachmentIds}
          />
        </div>

        <div className="lg:col-span-3">
          <ReceiptSummary
            total={receipt.finalTotal}
            canFinish={receipt.canFinish}
            saveState={receipt.saveState}
            onPayFull={() => finish(receipt.finalTotal)}
            onPayPart={() => setPayPartOpen(true)}
          />
        </div>
      </div>

      <PayPartDialog
        open={payPartOpen}
        total={receipt.finalTotal}
        onConfirm={finish}
        onCancel={() => setPayPartOpen(false)}
      />
    </PageContainer>
  );
}
