import { describe, expect, it } from 'vitest';
import type { OrderSummary, Permission } from '@mambo/contracts';
import { canCancelFarmerOrder, canRevokeFarmerLink, hasPickupSchedule } from '@/features/farmer/farmerAccessModel';

const order = (overrides: Partial<OrderSummary> = {}): OrderSummary => ({
  id: 'a5ae7516-6a98-4f30-9c37-348865a6a1aa',
  status: 'scheduled',
  version: 1,
  role: 'seller',
  createdByMe: true,
  counterpart: null,
  crop: null,
  productId: null,
  estQuantity: 10,
  unit: 'kg',
  offeredPrice: null,
  pickupAt: '2026-10-24T08:00:00.000Z',
  pickupAddress: null,
  branchId: null,
  partnerId: null,
  partnerName: null,
  createdAt: '2026-10-23T08:00:00.000Z',
  updatedAt: '2026-10-23T08:00:00.000Z',
  ...overrides,
});

describe('Farmer order UI follows API order contract', () => {
  it('shows active orders with a pickup time in the schedule view', () => {
    expect(hasPickupSchedule(order())).toBe(true);
    expect(hasPickupSchedule(order({ status: 'cancelled' }))).toBe(false);
    expect(hasPickupSchedule(order({ pickupAt: null }))).toBe(false);
  });

  it('checks cancellation permission for the side that created the order', () => {
    const create: readonly Permission[] = ['order:create'];
    const respond: readonly Permission[] = ['order:respond'];
    expect(canCancelFarmerOrder(order({ createdByMe: true }), create)).toBe(true);
    expect(canCancelFarmerOrder(order({ createdByMe: true }), respond)).toBe(false);
    expect(canCancelFarmerOrder(order({ createdByMe: false }), respond)).toBe(true);
    expect(canCancelFarmerOrder(order({ createdByMe: false }), create)).toBe(false);
    expect(canCancelFarmerOrder(order({ status: 'fulfilled' }), create)).toBe(false);
  });

  it('checks link revocation permission by link side', () => {
    expect(canRevokeFarmerLink('linked', ['linked:read'])).toBe(true);
    expect(canRevokeFarmerLink('owner', ['linked:read'])).toBe(false);
    expect(canRevokeFarmerLink('owner', ['partner:manage'])).toBe(true);
  });
});
