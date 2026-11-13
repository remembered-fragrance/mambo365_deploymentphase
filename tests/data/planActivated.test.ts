/**
 * Gói kích hoạt ngoài app (chuyển khoản lúc không ở màn chờ, hỗ trợ kích hoạt) báo qua thông báo `plan.activated`.
 * App phải đọc lại gói khi thấy thông báo MỚI — không thì băng "Gói đã hết hạn" nằm tới lần mở app sau.
 */

import { describe, expect, it } from 'vitest';
import type { NotificationView } from '@mambo/contracts';
import { newPlanActivations } from '@/data/hooks/useOrders';

const note = (id: string, kind: NotificationView['kind']): NotificationView => ({
  id, kind, from: null, orderId: null, orderStatus: null, pickupAt: null, linkId: null, read: false,
  createdAt: '2026-10-20T00:00:00.000Z',
});
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('newPlanActivations', () => {
  it('lần hỏi đầu chỉ ghi nhận — app vừa mở đã đọc gói mới', () => {
    const first = newPlanActivations(null, [note(A, 'plan.activated')]);
    expect(first.fresh).toBe(false);
    expect([...first.seen]).toEqual([A]);
  });

  it('🔴 thông báo kích hoạt mới so với lần trước ⇒ phải đọc lại gói', () => {
    const next = newPlanActivations(new Set([A]), [note(B, 'plan.activated'), note(A, 'plan.activated')]);
    expect(next.fresh).toBe(true);
    expect([...next.seen].sort()).toEqual([A, B]);
  });

  it('chỉ có thông báo cũ hay loại khác: không hỏi lại', () => {
    expect(newPlanActivations(new Set([A]), [note(A, 'plan.activated'), note(B, 'order.submitted')]).fresh).toBe(false);
  });
});
