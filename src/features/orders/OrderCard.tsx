import { Link } from 'react-router-dom';
import { cropMeta } from '@mambo/core/catalog';
import { formatDateTime, formatQuantity, formatVnd } from '@mambo/core/format';
import type { OrderStatus, OrderSummary } from '@mambo/contracts';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  submitted: 'alert',
  accepted: 'in',
  scheduled: 'in',
  fulfilled: 'neutral',
  cancelled: 'neutral',
};

export const OrderStatusBadge = ({ status }: { readonly status: OrderStatus }) => (
  <Badge tone={STATUS_TONE[status]} label={L[`orderStatus_${status}`]} />
);

/** "Mủ cao su · 1.000 kg · 18.000₫/kg" */
export const orderLine = (o: Pick<OrderSummary, 'crop' | 'estQuantity' | 'unit' | 'offeredPrice'>): string =>
  [
    o.crop ? cropMeta(o.crop)?.label : null,
    formatQuantity(o.estQuantity, o.unit),
    o.offeredPrice !== null ? `${formatVnd(o.offeredPrice)}/${o.unit}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Tên bên kia. Bên kia đã xoá tài khoản (`counterpart` null) thì lấy tên trong danh bạ của mình —
 * đơn vẫn ở trong sổ, chỉ tổ chức bên kia không còn.
 */
export const counterpartName = (o: Pick<OrderSummary, 'counterpart' | 'partnerName'>): string =>
  o.counterpart?.name ?? `${o.partnerName ?? L.notifySomeone} ${L.orderCounterpartGone}`;

/** Một dòng trong danh sách đơn. Bấm vào xem chi tiết và làm bước tiếp theo. */
export function OrderCard({ order }: { readonly order: OrderSummary }) {
  return (
    <Link to={ROUTES.orderDetail(order.id)} className="card flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-bold text-ink">
          {order.role === 'seller' ? L.orderSellTo : L.orderBuyFrom} {counterpartName(order)}
        </p>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="num text-sm text-ink-2">{orderLine(order)}</p>
      {order.pickupAt && order.status !== 'cancelled' && (
        <p className="num text-sm text-ink-3">
          {L.orderPickup}: {formatDateTime(order.pickupAt)}
        </p>
      )}
    </Link>
  );
}
