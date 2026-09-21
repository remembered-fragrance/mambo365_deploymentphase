import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { fail, must } from '../domain/errors';
import { MemoryPlatform } from '../infra/memory.platform';
import type { TxCtx } from '../infra/types';

@Injectable()
export class InventoryService {
  constructor(private readonly db: MemoryPlatform) {}

  availability(ctx: TxCtx) {
    this.db.requirePermission(ctx, 'workspaces.read');
    return [...this.db.inventoryLots.values()]
      .filter((l) => l.workspaceId === ctx.workspaceId)
      .map((l) => ({
        lotId: l.id,
        commodityId: l.commodityId,
        qtyOnHand: l.qtyOnHand,
        qtyReserved: l.qtyReserved,
        qtyAvailable: new Decimal(l.qtyOnHand).minus(l.qtyReserved).toFixed(3),
        origin: l.origin,
      }));
  }

  lots(ctx: TxCtx) {
    return this.availability(ctx);
  }

  adjust(ctx: TxCtx, input: { lotId: string; qty: string; reason: 'adjust' }) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'inventory.manage');
      const lot = must(this.db.inventoryLots.get(input.lotId));
      if (lot.workspaceId !== ctx.workspaceId) {
        fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
      }
      const qty = new Decimal(input.qty);
      const next = new Decimal(lot.qtyOnHand).plus(qty);
      if (next.lt(lot.qtyReserved)) fail('INSUFFICIENT_STOCK', 'Không đủ tồn sau điều chỉnh.');
      if (next.lt(0)) fail('INSUFFICIENT_STOCK', 'Không cho tồn âm.');
      lot.qtyOnHand = next.toFixed(3);
      lot.version += 1;
      this.db.movements.push({ lotId: lot.id, qty: qty.toFixed(3), reason: 'adjust', fulfillmentId: null });
      this.db.auditEvent(ctx, 'inventory.adjust', 'inventory_lot', lot.id);
      return lot;
    });
  }
}
