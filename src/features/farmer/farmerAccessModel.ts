import type { OrderSummary, Permission } from '@mambo/contracts';

const OPEN_STATUSES: readonly OrderSummary['status'][] = ['submitted', 'accepted', 'scheduled'];

/** Pickup time is a field on an order, not a separate calendar resource in the API. */
export function hasPickupSchedule(order: OrderSummary): boolean {
  return order.pickupAt !== null && OPEN_STATUSES.includes(order.status);
}

/** Backend cancellation permission depends on which side created the order. */
export function canCancelFarmerOrder(
  order: Pick<OrderSummary, 'createdByMe' | 'status'>,
  permissions: readonly Permission[],
): boolean {
  if (!OPEN_STATUSES.includes(order.status)) return false;
  return order.createdByMe
    ? permissions.includes('order:create')
    : permissions.includes('order:respond');
}

export function canRevokeFarmerLink(
  side: 'owner' | 'linked',
  permissions: readonly Permission[],
): boolean {
  return side === 'owner'
    ? permissions.includes('partner:manage')
    : permissions.includes('linked:read');
}
