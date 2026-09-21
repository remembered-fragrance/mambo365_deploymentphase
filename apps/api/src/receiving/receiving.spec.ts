import { describe, expect, it } from 'vitest';
import { OrdersService } from '../orders/orders.service';
import { ctx, harness, onboard } from '../test/harness';

describe('receiving', () => {
  it('A09/A10: cân + nhận một phần → nhập kho buyer, không tăng tồn lúc đặt đơn', async () => {
    const h = harness();
    const farmer = await onboard(h, 'rf', 'farmer', 'Hộ');
    const trader = await onboard(h, 'rt', 'trader', 'Vựa');
    const listing = await h.market.createListing(ctx('rf', farmer.workspace.id), {
      commodityId: h.rubber,
      qty: '1000',
    });
    await h.market.listingAction(ctx('rf', farmer.workspace.id), listing.id, 'published');
    const created = await h.quotes.create(ctx('rt', trader.workspace.id), {
      listingId: listing.id,
      toWorkspaceId: farmer.workspace.id,
      lines: [{ commodityId: h.rubber, qty: '1000', unitPrice: '20000' }],
    });
    await h.quotes.send(ctx('rt', trader.workspace.id), created.quotation.id);
    const accepted = (await h.quotes.accept(ctx('rf', farmer.workspace.id), created.quotation.id, {
      revisionId: created.revision.id,
      expectedVersion: created.quotation.version,
    })) as { orderId: string };

    expect([...h.db.inventoryLots.values()]).toHaveLength(0);

    const f = await h.receiving.createFulfillment(ctx('rt', trader.workspace.id), accepted.orderId, {
      expectedQty: '1000',
    });
    await h.receiving.weigh(ctx('rt', trader.workspace.id), f.id, { grossWeight: '1000' });
    await h.receiving.qualityCheck(ctx('rt', trader.workspace.id), f.id, {});
    await h.receiving.accept(ctx('rt', trader.workspace.id), f.id, {
      qtyAccepted: '600',
      qtyRejected: '400',
      operationId: '11111111-1111-4111-8111-aaaa00000001',
    });

    const lots = [...h.db.inventoryLots.values()].filter((l) => l.workspaceId === trader.workspace.id);
    expect(lots).toHaveLength(1);
    expect(lots[0].qtyOnHand).toBe('600.000');
    void OrdersService;
  });
});
