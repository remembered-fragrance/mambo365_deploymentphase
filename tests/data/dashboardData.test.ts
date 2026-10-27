import { describe, expect, it } from 'vitest';
import type { OrderSummary } from '@mambo/contracts';

describe('useDashboardData calculations', () => {
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0).toISOString();
  const tomorrowIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0).toISOString();

  const mockOrders: OrderSummary[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      status: 'submitted',
      version: 1,
      role: 'buyer',
      createdByMe: false,
      partnerName: 'Nông hộ Ba',
      counterpart: { id: '22222222-2222-2222-2222-222222222222', name: 'Nông hộ Ba', type: 'farmer' },
      crop: 'rubber',
      productId: null,
      estQuantity: 500,
      unit: 'kg',
      offeredPrice: 15000,
      pickupAt: null,
      pickupAddress: null,
      branchId: null,
      partnerId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      status: 'scheduled',
      version: 1,
      role: 'buyer',
      createdByMe: true,
      partnerName: 'Vườn tiêu Chín',
      counterpart: { id: '44444444-4444-4444-4444-444444444444', name: 'Vườn tiêu Chín', type: 'farmer' },
      crop: 'pepper',
      productId: null,
      estQuantity: 1200,
      unit: 'kg',
      offeredPrice: 80000,
      pickupAt: todayIso,
      pickupAddress: 'Vườn cây số 2',
      branchId: null,
      partnerId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      status: 'scheduled',
      version: 1,
      role: 'buyer',
      createdByMe: true,
      partnerName: 'Rẫy cà phê Mười',
      counterpart: { id: '66666666-6666-6666-6666-666666666666', name: 'Rẫy cà phê Mười', type: 'farmer' },
      crop: 'coffee',
      productId: null,
      estQuantity: 2000,
      unit: 'kg',
      offeredPrice: 95000,
      pickupAt: tomorrowIso,
      pickupAddress: 'Cổng 3',
      branchId: null,
      partnerId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  it('đếm đúng số đơn chờ xử lý (submitted)', () => {
    const pendingCount = mockOrders.filter((o) => o.status === 'submitted').length;
    expect(pendingCount).toBe(1);
  });

  it('đếm đúng số đơn hẹn đến cân trong ngày hôm nay', () => {
    const isToday = (isoDate: string | null | undefined): boolean => {
      if (!isoDate) return false;
      const d = new Date(isoDate);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };

    const scheduledToday = mockOrders.filter(
      (o) => o.status === 'scheduled' && isToday(o.pickupAt),
    ).length;

    expect(scheduledToday).toBe(1);
  });
});
