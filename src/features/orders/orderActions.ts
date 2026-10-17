/**
 * Nút nào hiện trên một đơn — đúng bảng "Ai làm gì" của FRONTEND §5.8. Server vẫn kiểm lại;
 * ẩn ở đây chỉ để không bày nút bấm vào là lỗi.
 */

import type { OrderStatus, OrderSummary, Permission } from '@mambo/contracts';

export interface OrderActions {
  readonly accept: boolean;
  readonly reject: boolean;
  readonly schedule: boolean;
  readonly cancel: boolean;
}

const OPEN: readonly OrderStatus[] = ['submitted', 'accepted', 'scheduled'];

export const orderActions = (
  order: Pick<OrderSummary, 'status' | 'role' | 'createdByMe'>,
  can: (permission: Permission) => boolean,
): OrderActions => {
  const respond = can('order:respond');
  // Bên NHẬN đơn (không phải bên tạo) nhận / từ chối khi đơn vừa gửi.
  const receiving = !order.createdByMe && order.status === 'submitted' && respond;
  return {
    accept: receiving,
    reject: receiving,
    // Bên MUA là người đến cân; gọi lại để đổi lịch.
    schedule: order.role === 'buyer' && (order.status === 'accepted' || order.status === 'scheduled') && respond,
    cancel: OPEN.includes(order.status) && (order.createdByMe ? can('order:create') : respond),
  };
};
