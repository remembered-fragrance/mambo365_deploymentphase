/**
 * Đơn hàng, đặt lịch, thông báo (BE5 — Thumua365_BE docs/FRONTEND.md §5.8).
 *
 * Đơn cần mạng: id do server sinh, không nằm trong sổ offline. Mọi bước chuyển gửi kèm `version`
 * đang thấy; lệch thì `ORDER_STATE_CHANGED` — tải lại đơn, không tự bấm lại.
 */

import type {
  NotificationsResult,
  OrderCreateInput,
  OrderDetail,
  OrderScheduleInput,
  OrdersListResult,
  OrderSummary,
} from '@mambo/contracts';
import { api } from './client';
import { track } from './track';

export const listOrders = (cursor?: string): Promise<OrdersListResult> => api.orders.list({ cursor });
export const getOrder = (id: string): Promise<OrderDetail> => api.orders.get(id);
export const createOrder = async (input: OrderCreateInput): Promise<OrderSummary> => {
  const order = await api.orders.create(input);
  track('order_created', { role: input.role });
  return order;
};

export type OrderStep = 'accept' | 'reject' | 'cancel';
export const stepOrder = async (step: OrderStep, id: string, version: number, note?: string): Promise<OrderSummary> => {
  const order = await api.orders[step](id, { version, note: note || null });
  if (step === 'accept') track('order_accepted', {});
  return order;
};

export const scheduleOrder = async (id: string, input: OrderScheduleInput): Promise<OrderSummary> => {
  const order = await api.orders.schedule(id, input);
  track('order_scheduled', {});
  return order;
};

export const listNotifications = (): Promise<NotificationsResult> => api.notifications.list();
/** Bỏ trống `ids` = đánh dấu tất cả. */
export const readNotifications = (ids?: string[]): Promise<{ unread: number }> =>
  api.notifications.read(ids ? { ids } : {});
