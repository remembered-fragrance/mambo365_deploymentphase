import { describe, expect, it } from 'vitest';
import type { OrderSummary, Permission } from '@mambo/contracts';
import { counterpartName } from '@/features/orders/OrderCard';
import { orderActions } from '@/features/orders/orderActions';
import { pickableOrders } from '@/features/receipt/OrderPicker';

const all = () => true;
const only = (...ps: Permission[]) => (p: Permission) => ps.includes(p);
const mai = { id: '6f1c1d2e-3b4a-4c5d-8e9f-0a1b2c3d4e5f', name: 'Hộ cô Mai', type: 'farmer' } as const;

describe('orderActions — bảng "Ai làm gì" FRONTEND §5.8', () => {
  it('vựa nhận đơn bán của nông dân: nhận, từ chối, huỷ; chưa hẹn lịch được', () => {
    expect(orderActions({ status: 'submitted', role: 'buyer', createdByMe: false, counterpart: mai }, all)).toEqual({
      accept: true,
      reject: true,
      schedule: false,
      cancel: true,
    });
  });

  it('nông dân tạo đơn: chỉ huỷ được, không tự nhận đơn của mình', () => {
    expect(orderActions({ status: 'submitted', role: 'seller', createdByMe: true, counterpart: mai }, all)).toEqual({
      accept: false,
      reject: false,
      schedule: false,
      cancel: true,
    });
  });

  it('bên mua hẹn lịch khi đã nhận, đổi lịch khi đã hẹn; bên bán thì không', () => {
    expect(orderActions({ status: 'accepted', role: 'buyer', createdByMe: false, counterpart: mai }, all).schedule).toBe(true);
    expect(orderActions({ status: 'scheduled', role: 'buyer', createdByMe: false, counterpart: mai }, all).schedule).toBe(true);
    expect(orderActions({ status: 'accepted', role: 'seller', createdByMe: true, counterpart: mai }, all).schedule).toBe(false);
  });

  it('đơn đã xong hoặc đã huỷ: không còn nút nào', () => {
    for (const status of ['fulfilled', 'cancelled'] as const) {
      expect(Object.values(orderActions({ status, role: 'buyer', createdByMe: false, counterpart: mai }, all))).not.toContain(true);
    }
  });

  it('bên kia đã xoá tài khoản: không còn nút nào, kể cả khi đơn còn ghi trạng thái mở', () => {
    for (const status of ['submitted', 'accepted', 'scheduled'] as const) {
      expect(orderActions({ status, role: 'buyer', createdByMe: false, counterpart: null }, all)).toEqual({
        accept: false,
        reject: false,
        schedule: false,
        cancel: false,
      });
    }
  });

  it('DN staff (không có order:respond): không nhận, không huỷ đơn người khác gửi tới', () => {
    const a = orderActions({ status: 'submitted', role: 'buyer', createdByMe: false, counterpart: mai }, only('order:create'));
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

describe('counterpartName — tên bên kia của đơn', () => {
  it('còn tài khoản → tên tổ chức; đã xoá → tên trong danh bạ của mình, kèm ghi chú', () => {
    expect(counterpartName({ counterpart: mai, partnerName: 'Cô Mai' })).toBe('Hộ cô Mai');
    expect(counterpartName({ counterpart: null, partnerName: 'Cô Mai' })).toBe('Cô Mai (đã xoá tài khoản)');
    expect(counterpartName({ counterpart: null, partnerName: null })).toBe('Bên kia (đã xoá tài khoản)');
  });
});
