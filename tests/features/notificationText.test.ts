/**
 * Xác nhận thanh toán cho khách (G1.2): `plan.activated` — máy chủ ghi khi tiền vào và gói được gia hạn — phải hiện
 * trong danh sách Thông báo. Trước đây mọi loại `plan.*` bị bỏ qua.
 */

import { describe, expect, it } from 'vitest';
import { notificationText } from '@/features/notifications/NotificationsPage';
import { L } from '@/i18n/labels';

describe('chữ của thông báo', () => {
  it('🔴 gói vừa gia hạn sau chuyển khoản: hiện lời xác nhận, không cần bên gửi', () => {
    expect(notificationText({ kind: 'plan.activated', from: null })).toBe(L.notifyPlanActivated);
  });

  it('thông báo đơn vẫn ghi tên bên gửi; loại chưa có màn thì bỏ qua', () => {
    expect(notificationText({ kind: 'order.accepted', from: { id: 'o1', name: 'Vựa Tư Hùng', type: 'trader' } })).toBe(
      `Vựa Tư Hùng ${L.notifyOrderAccepted}`,
    );
    expect(notificationText({ kind: 'member.invited', from: null })).toBeNull();
  });
});
