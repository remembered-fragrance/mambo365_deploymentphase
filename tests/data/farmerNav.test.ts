import { describe, expect, it } from 'vitest';
import { moreGroups, navGroups, navItems, secondaryItems, ROUTES } from '@/features/shared/navItems';
import type { Access } from '@/features/shared/access';

const farmer: Access = {
  orgType: 'farmer',
  permissions: ['order:create', 'order:respond', 'linked:read'],
};
const trader: Access = {
  orgType: 'trader',
  permissions: ['book:sync', 'linked:read', 'report:view'],
};
const counts = { drafts: 2, overdue: 1 };

describe('farmer navigation', () => {
  it('uses master farmer tabs and keeps legacy farmer routes available', () => {
    const bar = navItems(counts, farmer);
    expect(bar.map((item) => item.to)).toEqual([ROUTES.dashboard, ROUTES.orders, ROUTES.map, ROUTES.profile]);

    const secondary = secondaryItems(farmer);
    expect(secondary.some((item) => item.to === ROUTES.connect)).toBe(true);
    expect(secondary.find((item) => item.id === 'farmerWeighDebt')?.to).toBe('/can-no');
    expect(ROUTES.farmerOrders).toBe(ROUTES.orders);
    expect(ROUTES.farmerNetwork).toBe(ROUTES.connect);
  });

  it('requires linked:read for the retained weigh debt page', () => {
    const withoutLinks: Access = { orgType: 'farmer', permissions: ['order:create'] };
    expect(secondaryItems(withoutLinks).some((item) => item.id === 'farmerWeighDebt')).toBe(false);
  });

  it('does not expose farmer-only weigh debt navigation to traders', () => {
    expect(secondaryItems(trader).some((item) => item.id === 'farmerWeighDebt')).toBe(false);
    expect(navGroups(counts, trader).flatMap((group) => group.items).some((item) => item.id === 'farmerWeighDebt')).toBe(false);
  });

  it('keeps the legacy weigh debt page in the farmer More menu', () => {
    expect(moreGroups(farmer).flatMap((group) => group.items).some((item) => item.id === 'farmerWeighDebt')).toBe(true);
  });
});
