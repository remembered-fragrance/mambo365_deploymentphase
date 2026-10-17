import type { AppData, TransactionKind } from '@mambo/core/types';
import type { OrderSummary } from '@mambo/contracts';
import { Select } from '@/components/ui/Select';
import { useOrders } from '@/data/hooks/useOrders';
import { L } from '@/i18n/labels';
import { orderLine } from '../orders/OrderCard';

interface OrderPickerProps {
  readonly data: AppData;
  readonly kind: TransactionKind;
  readonly orderId?: string;
  readonly onPick: (orderId: string | undefined) => void;
  readonly onCounterparty: (id: string, name: string) => void;
}

/** Đơn gắn được vào phiếu: đã nhận / đã hẹn, đúng chiều — phiếu mua gắn đơn mình MUA, phiếu bán gắn đơn mình BÁN. */
export const pickableOrders = (orders: readonly OrderSummary[], kind: TransactionKind): OrderSummary[] =>
  orders.filter(
    (o) => (o.status === 'accepted' || o.status === 'scheduled') && o.role === (kind === 'purchase' ? 'buyer' : 'seller'),
  );

/**
 * Ô "Theo đơn" (FRONTEND §5.8). Chọn một đơn → điền sẵn người bán / người mua bằng `partnerId`
 * (dòng danh bạ trong sổ mình; null thì người dùng chọn tay). Không có tổ chức hay không có đơn
 * nào gắn được thì không hiện gì.
 */
export function OrderPicker({ data, kind, orderId, onPick, onCounterparty }: OrderPickerProps) {
  const orders = useOrders();
  const pickable = pickableOrders(orders.data ?? [], kind);
  if (pickable.length === 0 && !orderId) return null;

  const pick = (id: string) => {
    const order = pickable.find((o) => o.id === id);
    onPick(order?.id);
    if (!order?.partnerId) return;
    const parties = kind === 'purchase' ? data.suppliers : data.buyers;
    const name = parties.find((p) => p.id === order.partnerId)?.name ?? order.counterpart.name;
    onCounterparty(order.partnerId, name);
  };

  return (
    <Select
      label={L.orderPick}
      hint={L.orderPickHint}
      value={orderId ?? ''}
      options={[
        { value: '', label: L.orderPickNone },
        ...pickable.map((o) => ({ value: o.id, label: `${o.counterpart.name} · ${orderLine(o)}` })),
      ]}
      onValueChange={pick}
    />
  );
}
