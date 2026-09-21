import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { fail, must } from '../domain/errors';
import { assertLngLat } from '../domain/geo';
import { newId } from '../domain/ids';
import { locationPublishTransition } from '../domain/machines';
import { MemoryPlatform } from '../infra/memory.platform';
import type { Location, TxCtx } from '../infra/types';

const MAX_RADIUS = 50_000;
const MAX_BBOX_SPAN = 2;

@Injectable()
export class LocationsService {
  constructor(private readonly db: MemoryPlatform) {}

  nearby(query: {
    lat: number;
    lng: number;
    radiusM?: number;
    commodityId?: string;
    limit?: number;
    cursor?: string;
  }) {
    assertLngLat(query.lng, query.lat);
    const radiusM = Math.min(query.radiusM ?? 5000, MAX_RADIUS);
    if (radiusM <= 0) fail('VALIDATION_FAILED', 'Bán kính không hợp lệ.');
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    let afterDistance: number | undefined;
    let afterId: string | undefined;
    if (query.cursor) {
      try {
        const p = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')) as {
          d: number;
          id: string;
        };
        afterDistance = p.d;
        afterId = p.id;
      } catch {
        fail('VALIDATION_FAILED', 'Cursor không hợp lệ.');
      }
    }
    const items = this.db.nearby({
      lat: query.lat,
      lng: query.lng,
      radiusM,
      commodityId: query.commodityId,
      limit: limit + 1,
      afterDistance,
      afterId,
    });
    const page = items.slice(0, limit);
    const extra = items[limit];
    const nextCursor = extra
      ? Buffer.from(JSON.stringify({ d: page[page.length - 1].distanceM, id: page[page.length - 1].id })).toString(
          'base64url',
        )
      : null;
    return { items: page, nextCursor };
  }

  inBounds(query: { minLat: number; minLng: number; maxLat: number; maxLng: number; zoom?: number }) {
    if (
      query.maxLat - query.minLat > MAX_BBOX_SPAN ||
      query.maxLng - query.minLng > MAX_BBOX_SPAN
    ) {
      fail('VALIDATION_FAILED', 'Vùng bản đồ quá lớn. Thu nhỏ bbox.');
    }
    const cx = (query.minLat + query.maxLat) / 2;
    const cy = (query.minLng + query.maxLng) / 2;
    const radiusM = Math.min(
      50000,
      Math.max(
        this.approxM(query.minLat, query.minLng, query.maxLat, query.maxLng),
        500,
      ),
    );
    return this.nearby({ lat: cx, lng: cy, radiusM, limit: 100 });
  }

  private approxM(minLat: number, minLng: number, maxLat: number, maxLng: number): number {
    const dLat = (maxLat - minLat) * 111_000;
    const dLng = (maxLng - minLng) * 111_000 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    return Math.hypot(dLat, dLng);
  }

  publicGet(id: string) {
    const l = must(this.db.locations.get(id));
    if (l.deletedAt || l.publishStatus !== 'published') {
      fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    }
    const caps = this.db.capabilities.filter((c) => c.locationId === l.id);
    const hours = { timezone: 'Asia/Ho_Chi_Minh' };
    return {
      id: l.id,
      name: l.name,
      type: l.type,
      addressText: l.addressText,
      lat: l.lat,
      lng: l.lng,
      publicContactName: l.publicContactName,
      publicPhone: l.publicPhone,
      verificationStatus: l.verificationStatus,
      capabilities: caps,
      hours,
    };
  }

  create(
    ctx: TxCtx,
    input: {
      name: string;
      addressText: string;
      type?: Location['type'];
      lat?: number;
      lng?: number;
      publicContactName?: string;
      publicPhone?: string;
    },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'locations.manage');
      if ((input.lat !== null && input.lat !== undefined) && (input.lng !== null && input.lng !== undefined)) assertLngLat(input.lng, input.lat);
      const row: Location = {
        id: newId(),
        workspaceId: ctx.workspaceId as string,
        type: input.type ?? 'procurement_point',
        name: input.name,
        addressText: input.addressText,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        publicContactName: input.publicContactName ?? null,
        publicPhone: input.publicPhone ?? null,
        verificationStatus: 'unverified',
        publishStatus: 'draft',
        version: 1,
        deletedAt: null,
      };
      this.db.locations.set(row.id, row);
      this.db.appendFeed(ctx, row.workspaceId, 'location', row.id, 'upsert', { status: row.publishStatus });
      return row;
    });
  }

  submitReview(ctx: TxCtx, id: string) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'locations.publish');
      const l = must(this.db.locations.get(id));
      if (l.workspaceId !== ctx.workspaceId) fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
      locationPublishTransition(l.publishStatus, 'pending_review');
      if ((l.lat === null || l.lat === undefined) || (l.lng === null || l.lng === undefined)) fail('VALIDATION_FAILED', 'Điểm công bố phải có tọa độ.');
      this.db.requireEntitlement(l.workspaceId, 'listings.publish');
      l.publishStatus = 'pending_review';
      l.version += 1;
      this.db.appendOutbox('location.submit_review', { locationId: l.id });
      return l;
    });
  }

  moderatePublish(ctx: TxCtx, id: string, decision: 'published' | 'rejected', reason?: string) {
    return this.db.tx(async () => {
      if (!ctx.isPlatform) fail('PERMISSION_DENIED', 'Chỉ vận hành nền tảng được duyệt điểm.');
      const l = must(this.db.locations.get(id));
      const ws = this.db.workspaces.get(l.workspaceId);
      if (ws?.ownerUserId === ctx.actorId) {
        fail('PERMISSION_DENIED', 'Không tự duyệt điểm của mình.');
      }
      locationPublishTransition(l.publishStatus, decision);
      l.publishStatus = decision;
      if (decision === 'rejected') l.verificationStatus = 'rejected';
      l.version += 1;
      this.db.auditEvent(ctx, `location.${decision}`, 'location', id);
      this.db.appendOutbox('location.moderated', { locationId: id, decision, reason });
      return l;
    });
  }

  addPriceQuote(
    ctx: TxCtx,
    locationId: string,
    input: { commodityId: string; price: string; validFrom: string; validTo?: string; priceKind?: 'reference' | 'conditional_commit' },
  ) {
    return this.db.tx(async () => {
      this.db.requirePermission(ctx, 'locations.manage');
      const l = must(this.db.locations.get(locationId));
      if (l.workspaceId !== ctx.workspaceId) fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
      const price = new Decimal(input.price);
      if (!price.isFinite() || price.isNegative()) fail('VALIDATION_FAILED', 'Giá không hợp lệ.');
      const row = {
        id: newId(),
        locationId,
        workspaceId: l.workspaceId,
        commodityId: input.commodityId,
        price: price.toFixed(2),
        unit: 'kg',
        priceKind: input.priceKind ?? ('reference' as const),
        validFrom: input.validFrom,
        validTo: input.validTo ?? null,
      };
      this.db.priceQuotes.set(row.id, row);
      return row;
    });
  }

  follow(userId: string, locationId: string, on: boolean) {
    const l = must(this.db.locations.get(locationId));
    if (l.publishStatus !== 'published') fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    for (let i = this.db.follows.length - 1; i >= 0; i -= 1) {
      if (this.db.follows[i].userId === userId && this.db.follows[i].locationId === locationId) {
        this.db.follows.splice(i, 1);
      }
    }
    if (on) this.db.follows.push({ userId, locationId });
    return { following: on };
  }
}
