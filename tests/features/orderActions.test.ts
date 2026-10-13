import { describe, expect, it } from 'vitest';
import type { OrderSummary, Permission } from '@mambo/contracts';
import { orderActions } from '@/features/orders/orderActions';
import { pickableOrders } from '@/features/receipt/OrderPicker';

const all = () => true;
const only = (...ps: Permission[]) => (p: Permission) => ps.includes(p);

describe('orderActions — bảng "Ai làm gì" FRONTEND §5.8', () => {
  it('vựa nhận đơn bán của nông dân: nhận, từ chối, huỷ; chưa hẹn lịch được', () => {
    expect(orderActions({ status: 'submitted', role: 'buyer', createdByMe: false }, all)).toEqual({
      accept: true,
      reject: true,
      schedule: false,
      cancel: true,
    });
  });

  it('nông dân tạo đơn: chỉ huỷ được, không tự nhận đơn của mình', () => {
    expect(orderActions({ status: 'submitted', role: 'seller', createdByMe: true }, all)).toEqual({
      accept: false,
      reject: false,
      schedule: false,
      cancel: true,
    });
  });

  it('bên mua hẹn lịch khi đã nhận, đổi lịch khi đã hẹn; bên bán thì không', () => {
    expect(orderActions({ status: 'accepted', role: 'buyer', createdByMe: false }, all).schedule).toBe(true);
    expect(orderActions({ status: 'scheduled', role: 'buyer', createdByMe: false }, all).schedule).toBe(true);
    expect(orderActions({ status: 'accepted', role: 'seller', createdByMe: true }, all).schedule).toBe(false);
  });

  it('đơn đã xong hoặc đã huỷ: không còn nút nào', () => {
    for (const status of ['fulfilled', 'cancelled'] as const) {
      expect(Object.values(orderActions({ status, role: 'buyer', createdByMe: false }, all))).not.toContain(true);
    }
  });

  it('DN staff (không có order:respond): không nhận, không huỷ đơn người khác gửi tới', () => {
    const a = orderActions({ status: 'submitted', role: 'buyer', createdByMe: false }, only('order:create'));
    expect(a).toEqual({ accept: false, reject: false, schedule: false, cancel: false });
  });
});

describe('pickableOrders — ô "Theo đơn"', () => {
  const order = (status: OrderSummary['status'], role: OrderSummary['role']) =>
    ({ id: `${status}-${role}`, status, role }) as OrderSummary;
  const orders = [
    order('submitted', 'buyer'),
    order('accepted', 'buyer'),
    order('scheduled', 'buyer'),
    order('scheduled', 'seller'),
    order('fulfilled', 'buyer'),
    order('cancelled', 'buyer'),
  ];

  it('phiếu mua chỉ gắn đơn mình MUA đã nhận / đã hẹn', () => {
    expect(pickableOrders(orders, 'purchase').map((o) => o.id)).toEqual(['accepted-buyer', 'scheduled-buyer']);
  });

  it('phiếu bán chỉ gắn đơn mình BÁN', () => {
    expect(pickableOrders(orders, 'sale').map((o) => o.id)).toEqual(['scheduled-seller']);
  });
});
