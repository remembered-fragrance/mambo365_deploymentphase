import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { fail, must } from '../domain/errors';
import { newId } from '../domain/ids';
import { listingTransition } from '../domain/machines';
import { MemoryPlatform } from '../infra/memory.platform';
import type { Farm, HarvestLot, Listing, TxCtx } from '../infra/types';

@Injectable()
export class MarketplaceService {
  constructor(private readonly db: MemoryPlatform) {}

  createFarm(ctx: TxCtx, input: { name: string; addressText?: string }) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'farms.manage');
      const farm: Farm = {
        id: newId(),
        workspaceId: ctx.workspaceId as string,
        name: input.name,
        addressText: input.addressText ?? null,
        lat: null,
        lng: null,
        geoVisibility: 'hidden',
        version: 1,
      };
      this.db.farms.set(farm.id, farm);
      return farm;
    });
  }

  createLot(
    ctx: TxCtx,
    farmId: string,
    input: { commodityId: string; harvestedQty: string },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'farms.manage');
      const farm = must(this.db.farms.get(farmId));
      if (farm.workspaceId !== ctx.workspaceId) {
        fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
      }
      const harvested = new Decimal(input.harvestedQty);
      if (!harvested.isFinite() || harvested.lte(0)) fail('VALIDATION_FAILED', 'Sản lượng không hợp lệ.');
      const lot: HarvestLot = {
        id: newId(),
        farmId,
        workspaceId: farm.workspaceId,
        commodityId: input.commodityId,
        harvestedQty: harvested.toFixed(3),
        reservedQty: '0.000',
        deliveredQty: '0.000',
        status: 'open',
        version: 1,
      };
      this.db.lots.set(lot.id, lot);
      return lot;
    });
  }

  listFarms(ctx: TxCtx) {
    this.db.requirePermission(ctx, 'workspaces.read');
    return [...this.db.farms.values()].filter((f) => f.workspaceId === ctx.workspaceId);
  }

  createListing(
    ctx: TxCtx,
    input: {
      farmId?: string;
      harvestLotId?: string;
      commodityId: string;
      qty: string;
      desiredPrice?: string;
      deliveryMode?: Listing['deliveryMode'];
    },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'listings.manage');
      const qty = new Decimal(input.qty);
      if (!qty.isFinite() || qty.lte(0)) fail('VALIDATION_FAILED', 'Khối lượng phải lớn hơn 0.');
      if (input.harvestLotId) {
        const lot = this.db.lots.get(input.harvestLotId);
        if (!lot || lot.workspaceId !== ctx.workspaceId) {
          fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
        }
      }
      const listing: Listing = {
        id: newId(),
        workspaceId: ctx.workspaceId as string,
        harvestLotId: input.harvestLotId ?? null,
        commodityId: input.commodityId,
        qty: qty.toFixed(3),
        unit: 'kg',
        desiredPrice: input.desiredPrice ?? null,
        negotiable: true,
        deliveryMode: input.deliveryMode ?? 'either',
        status: 'draft',
        expiresAt: null,
        version: 1,
      };
      this.db.listings.set(listing.id, listing);
      return listing;
    });
  }

  listingAction(ctx: TxCtx, id: string, to: 'published' | 'paused' | 'cancelled') {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'listings.manage');
      const listing = must(this.db.listings.get(id));
      if (listing.workspaceId !== ctx.workspaceId) {
        fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
      }
      listingTransition(listing.status, to);
      if (to === 'published') {
        this.db.requireEntitlement(listing.workspaceId, 'listings.publish');
        if (listing.harvestLotId) {
          const lot = must(this.db.lots.get(listing.harvestLotId), 'Lô không tồn tại.', 'VALIDATION_FAILED');
          const avail = new Decimal(lot.harvestedQty).minus(lot.reservedQty).minus(lot.deliveredQty);
          if (avail.lt(listing.qty)) fail('INSUFFICIENT_STOCK', 'Lô không đủ sản lượng đã thu hoạch.');
        }
      }
      listing.status = to;
      listing.version += 1;
      this.db.appendFeed(ctx, listing.workspaceId, 'listing', listing.id, 'upsert', { status: to });
      this.db.appendOutbox('listing.changed', { listingId: listing.id, status: to });
      return listing;
    });
  }

  createBuyRequest(ctx: TxCtx, input: { commodityId: string; qty: string }) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'listings.manage');
      const qty = new Decimal(input.qty);
      if (!qty.isFinite() || qty.lte(0)) fail('VALIDATION_FAILED', 'Khối lượng phải lớn hơn 0.');
      const row: Listing = {
        id: newId(),
        workspaceId: ctx.workspaceId as string,
        harvestLotId: null,
        commodityId: input.commodityId,
        qty: qty.toFixed(3),
        unit: 'kg',
        desiredPrice: null,
        negotiable: true,
        deliveryMode: 'either',
        status: 'draft',
        expiresAt: null,
        version: 1,
      };
      this.db.buyRequests.set(row.id, row);
      return row;
    });
  }
}
