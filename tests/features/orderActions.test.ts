import { describe, expect, it } from 'vitest';
import type { Permission } from '@mambo/contracts';
import { orderActions } from '@/features/orders/orderActions';

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
