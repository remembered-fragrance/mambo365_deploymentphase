import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderSummary } from '@mambo/contracts';
import { parseNumber } from '@mambo/core/parseNumber';
import { canCancelFarmerOrder, hasPickupSchedule } from './farmerAccessModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useFarmerConnections } from '@/data/hooks/useFarmerConnections';
import { useFarmerOrders, type FarmerOrderDetail } from '@/data/hooks/useFarmerOrders';
import { useStore } from '@/data/useStore';
import { useToast } from '@/components/ui/Toast';
import { L } from '@/i18n/labels';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { ROUTES } from '../shared/navItems';

type Crop = 'rubber' | 'cashew' | 'coffee' | 'pepper';
const CROP_OPTIONS = [
  { value: 'rubber', label: L.cropRubber },
  { value: 'cashew', label: L.cropCashew },
  { value: 'coffee', label: L.cropCoffee },
  { value: 'pepper', label: L.cropPepper },
];

export function FarmerOrdersPage() {
  const { orgType, permissions } = useStore();
  const toast = useToast();
  const ordersApi = useFarmerOrders();
  const connections = useFarmerConnections();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [filter, setFilter] = useState<'active' | 'schedule' | 'history'>('active');
  const canCreate = permissions.includes('order:create');
  const activePartners = connections.balances.map((item) => item.organization);
  const shown = useMemo(() => ordersApi.orders.filter((order) =>
    filter === 'active'
      ? ['submitted', 'accepted', 'scheduled'].includes(order.status)
      : filter === 'schedule'
        ? hasPickupSchedule(order)
        : ['fulfilled', 'cancelled'].includes(order.status),
  ), [filter, ordersApi.orders]);

  if (orgType !== 'farmer' || ordersApi.availability === 'wrong-org') {
    return <PageContainer><DashboardHeader /><EmptyState title={L.farmerOnlyPage} /></PageContainer>;
  }

  if (ordersApi.availability === 'feature-off') {
    return <PageContainer><DashboardHeader /><EmptyState title={L.farmerOrdersFeatureOff} description={L.farmerOrdersFeatureOffHint} /></PageContainer>;
  }
  if (ordersApi.availability === 'permission-missing') {
    return <PageContainer><DashboardHeader /><EmptyState title={L.farmerOrdersPermissionOff} /></PageContainer>;
  }

  return (
    <PageContainer width="wide">
      <DashboardHeader />
      <PageHeader title={L.farmerOrders} actions={canCreate ? <Button tone="primary" onClick={() => setCreateOpen(true)}>{L.farmerCreateOrder}</Button> : undefined} />
      {ordersApi.error && <ErrorNotice message={ordersApi.error} onRetry={ordersApi.refresh} />}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button tone={filter === 'active' ? 'primary' : 'quiet'} onClick={() => setFilter('active')}>{L.farmerActiveOrders}</Button>
        <Button tone={filter === 'schedule' ? 'primary' : 'quiet'} onClick={() => setFilter('schedule')}>{L.farmerPickupSchedule}</Button>
        <Button tone={filter === 'history' ? 'primary' : 'quiet'} onClick={() => setFilter('history')}>{L.farmerOrderHistory}</Button>
      </div>
      {ordersApi.loading ? <p className="text-sm text-ink-3">{L.loading}</p> : shown.length === 0 ? (
        <EmptyState title={filter === 'active' ? L.farmerNoOrders : filter === 'schedule' ? L.farmerNoPickupSchedule : L.farmerNoOrderHistory} description={filter === 'active' ? L.farmerNoOrdersHint : filter === 'schedule' ? L.farmerNoPickupScheduleHint : undefined} icon={filter === 'schedule' ? '🗓️' : '📦'} action={filter === 'active' && canCreate ? <Button tone="primary" onClick={() => setCreateOpen(true)}>{L.farmerCreateOrder}</Button> : undefined} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((order) => <OrderCard key={order.id} order={order} onOpen={() => { setSelectedOrder(order); void ordersApi.openOrder(order.id); }} />)}
        </div>
      )}
      {ordersApi.cursor && <div className="mt-4 flex justify-center"><Button onClick={ordersApi.loadMore} disabled={ordersApi.loadingMore}>{ordersApi.loadingMore ? L.loading : L.loadMore}</Button></div>}
      {canCreate && <CreateOrderDialog open={createOpen} partners={activePartners} loading={ordersApi.mutating} error={ordersApi.error} onClose={() => setCreateOpen(false)} onSubmit={async (input) => { await ordersApi.createOrder(input); setCreateOpen(false); toast({ message: L.farmerOrderCreated }); }} />}
      <OrderDetailDialog
        order={ordersApi.detail}
        fallback={selectedOrder}
        open={Boolean(selectedOrder)}
        busy={ordersApi.mutating}
        error={ordersApi.error}
        permissions={permissions}
        onClose={() => { setSelectedOrder(null); ordersApi.setDetail(null); }}
        onAction={async (order, action) => {
          if (await ordersApi.performAction(order, action)) toast({ message: L.farmerOrderUpdated });
        }}
      />
    </PageContainer>
  );
}

function OrderCard({ order, onOpen }: { readonly order: OrderSummary; readonly onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="card w-full p-4 text-left transition hover:border-brand">
      <div className="flex items-start justify-between gap-3"><p className="font-bold text-ink">{order.counterpart?.name ?? order.partnerName ?? L.farmerUnknownPartner}</p><span className="rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold text-ink-2">{statusLabel(order.status)}</span></div>
      <p className="num mt-3 text-lg font-extrabold text-brand">{order.estQuantity.toLocaleString('vi-VN')} {order.unit}</p>
      <p className="mt-1 text-sm text-ink-3">{order.crop ? cropLabel(order.crop) : L.farmerAnyCrop}{order.offeredPrice ? ` · ${order.offeredPrice.toLocaleString('vi-VN')} ${L.currencyPerKg}` : ''}</p>
      {order.pickupAt && <p className="mt-2 text-xs text-ink-3">{L.orderPickupAt}: {new Date(order.pickupAt).toLocaleString('vi-VN')}</p>}
    </button>
  );
}

function CreateOrderDialog({
  open, partners, loading, error, onClose, onSubmit,
}: {
  readonly open: boolean;
  readonly partners: readonly { readonly id: string; readonly name: string }[];
  readonly loading: boolean;
        readonly error: string | null;
  readonly onClose: () => void;
  readonly onSubmit: (input: { counterpartOrgId: string; crop: Crop | null; estQuantity: number; unit: string; offeredPrice: number | null; pickupAt: string | null; pickupAddress: string | null; note: string | null }) => Promise<void>;
}) {
  const [partnerId, setPartnerId] = useState('');
  const [crop, setCrop] = useState<Crop | ''>('rubber');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [pickupAt, setPickupAt] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const partner = partners.find((item) => item.id === partnerId);
  const qty = parseNumber(quantity);
  const offeredPrice = price.trim() ? parseNumber(price) : null;
  const invalid = !partner || qty <= 0 || (offeredPrice !== null && offeredPrice <= 0);
  const reset = () => { setPartnerId(''); setCrop('rubber'); setQuantity(''); setPrice(''); setPickupAt(''); setAddress(''); setNote(''); setSubmitted(false); };
  return (
    <Dialog open={open} title={L.farmerCreateOrder} description={L.farmerCreateOrderHint} onClose={() => { reset(); onClose(); }}>
      <div className="flex max-h-[70dvh] flex-col gap-3 overflow-y-auto pr-1">
        {partners.length ? <Select label={L.farmerChooseTrader} value={partnerId} options={[{ value: '', label: L.chooseOption }, ...partners.map((item) => ({ value: item.id, label: item.name }))]} onValueChange={setPartnerId} /> : <p className="text-sm text-ink-2">{L.farmerConnectBeforeOrder} <Link className="font-bold text-brand underline" to={ROUTES.farmerNetwork} onClick={onClose}>{L.farmerOpenConnections}</Link></p>}
        <Select label={L.product} value={crop} options={[{ value: '', label: L.farmerAnyCrop }, ...CROP_OPTIONS]} onValueChange={(value) => setCrop(value as Crop | '')} />
        <Input label={L.farmerEstimatedQuantity} type="number" min="0.01" step="any" inputMode="decimal" value={quantity} error={submitted && qty <= 0 ? L.farmerQuantityInvalid : undefined} onChange={(event) => setQuantity(event.target.value)} />
        <Input label={L.unitOfMeasure} value="kg" readOnly />
        <Input label={L.farmerOfferedPrice} type="number" min="1" step="1" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} />
        <Input label={L.farmerPickupAt} type="datetime-local" value={pickupAt} onChange={(event) => setPickupAt(event.target.value)} />
        <Input label={L.farmerPickupAddress} value={address} onChange={(event) => setAddress(event.target.value)} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-2">{L.note}<textarea className="input-base min-h-20" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        {submitted && invalid && <p role="alert" className="text-sm text-alert">{L.farmerOrderFormInvalid}</p>}
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <Button tone="primary" size="lg" block disabled={loading || !partners.length} onClick={() => { setSubmitted(true); if (invalid || !partner) return; void onSubmit({ counterpartOrgId: partner.id, crop: crop || null, estQuantity: qty, unit: 'kg', offeredPrice, pickupAt: pickupAt ? new Date(pickupAt).toISOString() : null, pickupAddress: address.trim() || null, note: note.trim() || null }).then(reset).catch(() => undefined); }}>{loading ? L.loading : L.farmerSendOrder}</Button>
      </div>
    </Dialog>
  );
}

function OrderDetailDialog({ order, fallback, open, busy, error, permissions, onClose, onAction }: {
  readonly order: FarmerOrderDetail | null;
  readonly fallback: OrderSummary | null;
  readonly open: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly permissions: readonly import('@mambo/contracts').Permission[];
  readonly onClose: () => void;
  readonly onAction: (order: OrderSummary | FarmerOrderDetail, action: 'accept' | 'reject' | 'cancel') => Promise<void>;
}) {
  const [confirmAction, setConfirmAction] = useState<'reject' | 'cancel' | null>(null);
  const current = order ?? fallback;
  if (!current) return null;
  const canRespondTo = permissions.includes('order:respond') && !current.createdByMe && current.status === 'submitted';
  const canCancelThis = canCancelFarmerOrder(current, permissions);
  return (
    <Dialog open={open} title={L.farmerOrderDetail} onClose={onClose}>
      <div className="flex max-h-[70dvh] flex-col gap-3 overflow-y-auto">
        <div className="rounded-xl bg-surface-2 p-3"><p className="font-bold text-ink">{current.counterpart?.name ?? current.partnerName ?? L.farmerUnknownPartner}</p><p className="mt-1 text-sm text-ink-2">{statusLabel(current.status)} · {current.estQuantity.toLocaleString('vi-VN')} {current.unit}</p><p className="mt-1 text-sm text-ink-2">{current.crop ? cropLabel(current.crop) : L.farmerAnyCrop} · {current.offeredPrice ? `${current.offeredPrice.toLocaleString('vi-VN')} ${L.currencyPerKg}` : L.farmerPriceNegotiable}</p>{current.pickupAt && <p className="mt-1 text-sm text-ink-2">{L.orderPickupAt}: {new Date(current.pickupAt).toLocaleString('vi-VN')}</p>}{current.pickupAddress && <p className="mt-1 text-sm text-ink-2">{current.pickupAddress}</p>}</div>
        {hasEvents(current) && <Card title={L.farmerOrderTimeline}>{current.events.length ? <ol className="flex flex-col gap-3">{current.events.map((event, index) => <li key={`${event.at}-${index}`} className="border-l-2 border-brand pl-3"><p className="text-sm font-semibold text-ink">{statusLabel(event.toStatus)} · {event.by === 'me' ? L.farmerYou : L.farmerCounterpart}</p><time className="text-xs text-ink-3">{new Date(event.at).toLocaleString('vi-VN')}</time>{event.note && <p className="mt-1 text-sm text-ink-2">{event.note}</p>}</li>)}</ol> : <p className="text-sm text-ink-3">{L.farmerNoOrderEvents}</p>}</Card>}
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <div className="flex flex-wrap gap-2">{canRespondTo && <><Button tone="primary" disabled={busy} onClick={() => void onAction(current, 'accept')}>{L.farmerAcceptOrder}</Button><Button tone="danger" disabled={busy} onClick={() => setConfirmAction('reject')}>{L.farmerRejectOrder}</Button></>}{canCancelThis && <Button tone="danger" disabled={busy} onClick={() => setConfirmAction('cancel')}>{L.farmerCancelOrder}</Button>}</div>
      </div>
      <ConfirmDialog open={confirmAction !== null} title={confirmAction === 'reject' ? L.farmerRejectOrder : L.farmerCancelOrder} consequence={confirmAction === 'reject' ? L.farmerRejectConsequence : L.farmerCancelConsequence} confirmLabel={confirmAction === 'reject' ? L.farmerRejectOrder : L.farmerCancelOrder} onCancel={() => setConfirmAction(null)} onConfirm={() => { const action = confirmAction; setConfirmAction(null); if (action) void onAction(current, action); }} />
    </Dialog>
  );
}

function ErrorNotice({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }) {
  return <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm"><span>{message}</span><Button onClick={onRetry}>{L.dashboardRetry}</Button></div>;
}

function statusLabel(status: OrderSummary['status']) {
  return ({ submitted: L.orderStatus_submitted, accepted: L.orderStatus_accepted, scheduled: L.orderStatus_scheduled, fulfilled: L.orderStatus_fulfilled, cancelled: L.orderStatus_cancelled })[status];
}

function cropLabel(crop: Crop) {
  return ({ rubber: L.cropRubber, cashew: L.cropCashew, coffee: L.cropCoffee, pepper: L.cropPepper })[crop];
}

function hasEvents(order: OrderSummary | FarmerOrderDetail): order is FarmerOrderDetail {
  return Array.isArray((order as FarmerOrderDetail).events);
}
