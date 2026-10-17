import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { formatVnd } from '@mambo/core/format';
import { newId } from '@mambo/core/id';
import type { TransactionKind } from '@mambo/core/types';
import { useSubscription } from '@/data/hooks/useSubscription';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { QuotaWall } from '../billing/QuotaWall';
import { HelpButton } from '../help/HelpButton';
import { FirstReceiptCoach } from '../onboarding/FirstReceiptCoach';
import { ROUTES } from '../shared/navItems';
import { CounterpartyPicker } from './CounterpartyPicker';
import { discardConsequence, nextSession } from './draftSessions';
import { LineEditor } from './LineEditor';
import { MoreInfoPanel } from './MoreInfoPanel';
import { OrderPicker } from './OrderPicker';
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
    // Đổi khách thay URL chứ không thêm lịch sử: Quay lại phải ra khỏi màn cân, không nhảy về từng khách
    // trước đó — càng không về `?draft=` của phiếu vừa chốt (gõ vào là dựng lại nháp mang id đã chốt).
    <ReceiptWorkspace key={sessionKey} draftId={draftId} kind={kind} setParams={(next) => setParams(next, { replace: true })} />
  );
}

interface WorkspaceProps {
  readonly draftId?: string;
  readonly kind: TransactionKind;
  readonly setParams: (next: URLSearchParams) => void;
}

function ReceiptWorkspace({ draftId, kind, setParams }: WorkspaceProps) {
  const { data } = useStore();
  const { quota } = useSubscription();
  const navigate = useNavigate();
  const toast = useToast();
  const receipt = useDraftReceipt(draftId, kind);
  const [payPartOpen, setPayPartOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const sessions = data.drafts.filter((d) => d.status === 'draft' && (d.kind ?? 'purchase') === kind);

  // Thanh tổng dính đáy nổi đè lên form: trình duyệt phải coi phần nó che là ngoài màn hình, không thì
  // chạm vào ô cân / giá ở đáy màn là gõ vào ô bị che. Xem `.sticky-total` trong index.css.
  useEffect(() => {
    document.documentElement.classList.add('sticky-total');
    return () => document.documentElement.classList.remove('sticky-total');
  }, []);

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
    goToDraft(nextSession(sessions, receipt.draftId));
  };

  /**
   * Khách bỏ đi, cân nhầm, bấm "Khách mới" thừa — nháp không chốt được thì phải xoá được, không
   * thì nằm mãi trên thanh "Đang cân". Không có "Hoàn tác": nháp đã xoá thì máy khác cũng xoá theo.
   */
  const discard = () => {
    const name = receipt.partyName;
    setDiscardOpen(false);
    receipt.discard();
    toast({ message: `${L.draftDiscarded} · ${name.trim() || L.walkIn}`, tone: 'alert' });
    goToDraft(nextSession(sessions, receipt.draftId));
  };

  /**
   * Khách gửi hàng lại, chờ giá, chưa lấy tiền: cất phiếu sang "Để dành" để thanh "Đang cân" chỉ còn
   * khách đang đứng ở sân. Về thẳng tab "Để dành" của màn Phiếu — thấy phiếu vừa cất nằm đó; bấm vào
   * là mở lại để chốt như thường.
   */
  const saveForLater = () => {
    const name = receipt.partyName;
    receipt.saveForLater();
    toast({ message: `${L.savedForLater} · ${name.trim() || L.walkIn}` });
    navigate(`${ROUTES.receipts}?tab=waiting`);
  };

  /**
   * Chạm trần thì thay cả màn tạo phiếu, không phải chặn lúc bấm "xong": người
   * dùng cân xong cả chuyến hàng rồi mới bị từ chối là cách tệ nhất để nói
   * chuyện tiền nong. Nháp đang cân dở vẫn nằm nguyên trong sổ.
   */
  if (quota.blocked) return <QuotaWall used={quota.used} limit={quota.limit} />;

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
          <OrderPicker
            data={data}
            kind={kind}
            orderId={receipt.orderId}
            onPick={receipt.setOrderId}
            onCounterparty={receipt.setCounterparty}
          />

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

          {receipt.status === 'waiting' ? (
            <div className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-2">{L.waitingNotice}</p>
              <Button className="shrink-0" onClick={receipt.backToWeighing}>
                {L.backToWeighing}
              </Button>
            </div>
          ) : (
            (receipt.draftId || receipt.canFinish) && (
              <Button block onClick={saveForLater}>
                {L.saveForLater}
              </Button>
            )
          )}

          {/* Cuối cột, xa hai nút chốt ở thanh tổng tiền — tay đeo găng không chạm nhầm. Nháp
              chưa lưu lần nào thì chưa có gì để xoá: rời màn là nó mất. */}
          {receipt.draftId && (
            <Button tone="danger" block onClick={() => setDiscardOpen(true)}>
              <TrashIcon className="h-4 w-4" />
              {L.discardDraft}
            </Button>
          )}
        </div>

        {/* Điện thoại: `contents` để thanh tổng dính theo cả lưới, không kẹt trong khung cao bằng chính nó. */}
        <div className="max-lg:contents lg:col-span-3">
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

      <ConfirmDialog
        open={discardOpen}
        title={L.discardDraftTitle}
        consequence={discardConsequence(receipt.partyName, receipt.finalTotal)}
        confirmLabel={L.del}
        onConfirm={discard}
        onCancel={() => setDiscardOpen(false)}
      />
    </PageContainer>
  );
}
