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

const NONE: OrderActions = { accept: false, reject: false, schedule: false, cancel: false };

export const orderActions = (
  order: Pick<OrderSummary, 'status' | 'role' | 'createdByMe' | 'counterpart'>,
  can: (permission: Permission) => boolean,
): OrderActions => {
  // Bên kia đã xoá tài khoản: server đã tự huỷ đơn còn mở; không còn ai ở đầu kia để làm bước nào.
  if (order.counterpart === null) return NONE;
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
