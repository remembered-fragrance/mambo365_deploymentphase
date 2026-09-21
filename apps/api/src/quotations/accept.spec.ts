import { describe, expect, it } from 'vitest';
import { AppError } from '../domain/errors';
import { OrdersService } from '../orders/orders.service';
import { ctx, harness, onboard } from '../test/harness';

describe('accept quotation', () => {
  it('A06: farmer chấp nhận quote trader → order + reservation', async () => {
    const h = harness();
    const farmer = await onboard(h, 'farmer-1', 'farmer', 'Hộ');
    const trader = await onboard(h, 'trader-1', 'trader', 'Vựa');
    const farm = await h.market.createFarm(ctx('farmer-1', farmer.workspace.id), { name: 'Rẫy' });
    const lot = await h.market.createLot(ctx('farmer-1', farmer.workspace.id), farm.id, {
      commodityId: h.rubber,
      harvestedQty: '2000',
    });
    const listing = await h.market.createListing(ctx('farmer-1', farmer.workspace.id), {
      commodityId: h.rubber,
      harvestLotId: lot.id,
      qty: '1200',
    });
    await h.market.listingAction(ctx('farmer-1', farmer.workspace.id), listing.id, 'published');

    const created = await h.quotes.create(ctx('trader-1', trader.workspace.id), {
      listingId: listing.id,
      toWorkspaceId: farmer.workspace.id,
      lines: [{ commodityId: h.rubber, qty: '1200', unitPrice: '32000' }],
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    await h.quotes.send(ctx('trader-1', trader.workspace.id), created.quotation.id);

    const accepted = (await h.quotes.accept(ctx('farmer-1', farmer.workspace.id), created.quotation.id, {
      revisionId: created.revision.id,
      expectedVersion: created.quotation.version,
      operationId: '11111111-1111-4111-8111-bbbbbbbbbbb1',
    })) as { orderId: string; status: string; reservation: { qty: string } };

    expect(accepted.status).toBe('confirmed');
    expect(accepted.reservation.qty).toBe('1200.000');
    const replay = await h.quotes.accept(ctx('farmer-1', farmer.workspace.id), created.quotation.id, {
      revisionId: created.revision.id,
      expectedVersion: created.quotation.version,
      operationId: '11111111-1111-4111-8111-bbbbbbbbbbb1',
    });
    expect(replay).toEqual(accepted);

    const orders = new OrdersService(h.db);
    const asFarmer = orders.get(ctx('farmer-1', farmer.workspace.id), accepted.orderId);
    const asTrader = orders.get(ctx('trader-1', trader.workspace.id), accepted.orderId);
    expect(asFarmer.role).toBe('seller');
    expect(asTrader.role).toBe('buyer');
    expect(asFarmer).not.toHaveProperty('seller_cost');
  });

  it('expired quote', async () => {
    const h = harness();
    const farmer = await onboard(h, 'farmer-2', 'farmer', 'Hộ');
    const trader = await onboard(h, 'trader-2', 'trader', 'Vựa');
    const created = await h.quotes.create(ctx('trader-2', trader.workspace.id), {
      toWorkspaceId: farmer.workspace.id,
      lines: [{ commodityId: h.rubber, qty: '10', unitPrice: '1' }],
      expiresAt: '2020-01-01T00:00:00.000Z',
    });
    await h.quotes.send(ctx('trader-2', trader.workspace.id), created.quotation.id);
    try {
      await h.quotes.accept(ctx('farmer-2', farmer.workspace.id), created.quotation.id, {
        revisionId: created.revision.id,
        expectedVersion: created.quotation.version,
      });
      throw new Error('expected');
    } catch (e) {
      expect((e as AppError).code).toBe('QUOTE_EXPIRED');
    }
  });

  it('wrong revision → VERSION_CONFLICT', async () => {
    const h = harness();
    const farmer = await onboard(h, 'farmer-3', 'farmer', 'Hộ');
    const trader = await onboard(h, 'trader-3', 'trader', 'Vựa');
    const created = await h.quotes.create(ctx('trader-3', trader.workspace.id), {
      toWorkspaceId: farmer.workspace.id,
      lines: [{ commodityId: h.rubber, qty: '10', unitPrice: '1' }],
    });
    await h.quotes.send(ctx('trader-3', trader.workspace.id), created.quotation.id);
    try {
      await h.quotes.accept(ctx('farmer-3', farmer.workspace.id), created.quotation.id, {
        revisionId: '00000000-0000-4000-8000-000000000001',
        expectedVersion: created.quotation.version,
      });
      throw new Error('expected');
    } catch (e) {
      expect((e as AppError).code).toBe('VERSION_CONFLICT');
    }
  });
});
