import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDateTime } from '@mambo/core/format';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { linkErrorMessage } from '@/data/hooks/useLinked';
import { scheduleOrder, stepOrder, useOrder, type OrderStep } from '@/data/hooks/useOrders';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { useAccess } from '../shared/useAccess';
import { counterpartName, orderLine, OrderStatusBadge } from './OrderCard';
import { orderActions } from './orderActions';

/** `datetime-local` cần giờ địa phương dạng `2026-10-13T08:30`. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** Một đơn: thông tin, bước tiếp theo theo vai, và lịch sử (cũ nhất trước). */
export function OrderDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAccess();
  const toast = useToast();
  const order = useOrder(id);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [when, setWhen] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const o = order.data;

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      toast({ message: L.orderSaved });
    } catch (err) {
      toast({ message: linkErrorMessage(err), tone: 'alert' });
    } finally {
      setBusy(false);
      setWhen(null);
      setAddress(null);
    }
    // Thành công hay bên kia vừa đổi đơn (ORDER_STATE_CHANGED): tải lại để thấy trạng thái mới, KHÔNG tự bấm lại.
    order.reload();
  };

  if (order.loading && !o) {
    return (
      <PageContainer width="content">
        <Skeleton rows={4} label={L.loading} />
      </PageContainer>
    );
  }
  if (!o) {
    return (
      <PageContainer width="content">
        {order.error ? (
          <ErrorState
            title={L.orderMissing}
            description={order.error}
            actions={<Button onClick={order.reload}>{L.retry}</Button>}
          />
        ) : (
          <EmptyState title={L.orderMissing} icon="📦" />
        )}
      </PageContainer>
    );
  }

  const actions = orderActions(o, can);
  const step = (s: OrderStep) => () => void run(() => stepOrder(s, o.id, o.version));
  const pickupWhen = when ?? toLocalInput(o.pickupAt);
  const pickupAddress = address ?? o.pickupAddress ?? '';

  return (
    <PageContainer width="content">
      <PageHeader
        title={`${o.role === 'seller' ? L.orderSellTo : L.orderBuyFrom} ${counterpartName(o)}`}
        actions={
          <Link to={ROUTES.orders} className="flex min-h-11 items-center font-semibold text-brand underline">
            {L.navOrders}
          </Link>
        }
      />

      <div className="grid gap-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="num text-base font-bold text-ink">{orderLine(o)}</p>
            <OrderStatusBadge status={o.status} />
          </div>
          {o.pickupAt && (
            <p className="num mt-2 text-sm text-ink-2">
              {L.orderPickup}: {formatDateTime(o.pickupAt)}
              {o.pickupAddress ? ` · ${o.pickupAddress}` : ''}
            </p>
          )}
          {o.status === 'scheduled' && <p className="mt-2 text-sm text-ink-3">{L.orderFulfilledHint}</p>}
          {!o.counterpart && <p className="mt-2 text-sm text-ink-3">{L.orderCounterpartGoneHint}</p>}
        </Card>

        {(actions.accept || actions.reject) && (
          <div className="grid grid-cols-2 gap-2">
            <Button tone="primary" size="lg" disabled={busy} onClick={step('accept')}>
              {L.orderAccept}
            </Button>
            <Button size="lg" disabled={busy} onClick={step('reject')}>
              {L.orderReject}
            </Button>
          </div>
        )}

        {actions.schedule && (
          <Card title={o.status === 'scheduled' ? L.orderReschedule : L.orderSchedule}>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!pickupWhen) return;
                void run(() =>
                  scheduleOrder(o.id, {
                    version: o.version,
                    pickupAt: new Date(pickupWhen).toISOString(),
                    pickupAddress: pickupAddress.trim() || null,
                  }),
                );
              }}
            >
              <Input
                label={L.orderScheduleWhen}
                type="datetime-local"
                required
                value={pickupWhen}
                onChange={(e) => setWhen(e.target.value)}
              />
              <Input
                label={L.orderPickupAddress}
                value={pickupAddress}
                maxLength={300}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Button type="submit" tone="primary" block disabled={busy || !pickupWhen}>
                {o.status === 'scheduled' ? L.orderReschedule : L.orderSchedule}
              </Button>
            </form>
          </Card>
        )}

        <section aria-labelledby="order-history">
          <h2 id="order-history" className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3">
            {L.orderHistory}
          </h2>
          <ol className="card flex flex-col gap-2 p-4 text-sm">
            {o.events.map((e, i) => (
              <li key={i} className="flex flex-col">
                <span className="text-ink">
                  <span className="font-bold">{e.by === 'me' ? L.orderByMe : counterpartName(o)}</span> ·{' '}
                  {L[`orderStatus_${e.toStatus}`]}
                </span>
                <span className="num text-ink-3">{formatDateTime(e.at)}</span>
                {e.note && <span className="text-ink-2">{e.note}</span>}
              </li>
            ))}
          </ol>
        </section>

        {actions.cancel && (
          <Button tone="danger" block disabled={busy} onClick={() => setConfirmCancel(true)}>
            {L.orderCancel}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={L.orderCancel}
        consequence={L.orderCancelConsequence}
        confirmLabel={L.orderCancel}
        onConfirm={() => {
          setConfirmCancel(false);
          step('cancel')();
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </PageContainer>
  );
}
