import { describe, expect, it } from 'vitest';
import { AppError } from '../domain/errors';
import { ctx, harness, onboard } from '../test/harness';

describe('nearby', () => {
  it('A04/A05: published + radius, không dump, straight_line', async () => {
    const h = harness();
    const trader = await onboard(h, 'map-1', 'trader', 'Vựa');
    const c = ctx('map-1', trader.workspace.id);
    const loc = await h.locations.create(c, {
      name: 'Vựa Bình Phước',
      addressText: 'BP',
      lat: 11.75,
      lng: 106.72,
    });
    h.db.capabilities.push({
      locationId: loc.id,
      commodityId: h.rubber,
      pickupAvailable: true,
    });
    loc.publishStatus = 'published';

    const far = await h.locations.create(c, {
      name: 'Xa',
      addressText: 'HN',
      lat: 21.03,
      lng: 105.85,
    });
    far.publishStatus = 'published';

    const res = h.locations.nearby({
      lat: 11.75,
      lng: 106.72,
      radiusM: 5000,
      commodityId: h.rubber,
      limit: 20,
    });
    expect(res.items).toHaveLength(1);
    expect(res.items[0].distanceKind).toBe('straight_line');
    expect(res.items[0].name).toBe('Vựa Bình Phước');
  });

  it('bbox quá lớn', async () => {
    const h = harness();
    try {
      h.locations.inBounds({ minLat: 8, minLng: 102, maxLat: 23, maxLng: 110 });
      throw new Error('expected');
    } catch (e) {
      expect((e as AppError).code).toBe('VALIDATION_FAILED');
    }
  });
});
