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

export const listOrders = (cursor?: string): Promise<OrdersListResult> => api.orders.list({ cursor });
export const getOrder = (id: string): Promise<OrderDetail> => api.orders.get(id);
export const createOrder = (input: OrderCreateInput): Promise<OrderSummary> => api.orders.create(input);

export type OrderStep = 'accept' | 'reject' | 'cancel';
export const stepOrder = (step: OrderStep, id: string, version: number, note?: string): Promise<OrderSummary> =>
  api.orders[step](id, { version, note: note || null });

export const scheduleOrder = (id: string, input: OrderScheduleInput): Promise<OrderSummary> =>
  api.orders.schedule(id, input);

export const listNotifications = (): Promise<NotificationsResult> => api.notifications.list();
/** Bỏ trống `ids` = đánh dấu tất cả. */
export const readNotifications = (ids?: string[]): Promise<{ unread: number }> =>
  api.notifications.read(ids ? { ids } : {});
