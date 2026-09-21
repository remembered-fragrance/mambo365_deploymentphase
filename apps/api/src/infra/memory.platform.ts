import { newId, SYSTEM_ROLE_IDS } from '../domain/ids';
import { hasPermission, type Permission } from '../domain/permissions';
import { AppError, fail, must } from '../domain/errors';
import { haversineM } from '../domain/geo';
import type {
  AcceptanceRecord,
  Allocation,
  Appointment,
  Capability,
  ChangeFeedRow,
  Farm,
  Fulfillment,
  HarvestLot,
  IdempotencyRow,
  IdempotentOp,
  InventoryLot,
  Listing,
  Location,
  Membership,
  OrderLine,
  OrderParticipant,
  OutboxEvent,
  Party,
  PriceQuote,
  Profile,
  QuoteLine,
  QuoteRevision,
  Quotation,
  Reservation,
  RpEntry,
  Settlement,
  TradeOrder,
  TxCtx,
  Warehouse,
  WeighingRecord,
  Workspace,
} from './types';
import { notFound } from './types';

export class MemoryPlatform {
  readonly profiles = new Map<string, Profile>();
  readonly workspaces = new Map<string, Workspace>();
  readonly memberships = new Map<string, Membership>();
  readonly invitations = new Map<string, {
    id: string;
    workspaceId: string;
    emailOrPhone: string;
    roleId: string;
    tokenHash: string;
    expiresAt: string;
    acceptedAt: string | null;
    invitedBy: string;
  }>();
  readonly parties = new Map<string, Party>();
  readonly farms = new Map<string, Farm>();
  readonly lots = new Map<string, HarvestLot>();
  readonly locations = new Map<string, Location>();
  readonly capabilities: Capability[] = [];
  readonly priceQuotes = new Map<string, PriceQuote>();
  readonly listings = new Map<string, Listing>();
  readonly buyRequests = new Map<string, Listing>();
  readonly quotations = new Map<string, Quotation>();
  readonly revisions = new Map<string, QuoteRevision>();
  readonly quoteLines = new Map<string, QuoteLine>();
  readonly orders = new Map<string, TradeOrder>();
  readonly orderLines = new Map<string, OrderLine>();
  readonly participants: OrderParticipant[] = [];
  readonly orderViews: { workspaceId: string; orderId: string; direction: 'inbound' | 'outbound' }[] = [];
  readonly appointments = new Map<string, Appointment>();
  readonly fulfillments = new Map<string, Fulfillment>();
  readonly weighings = new Map<string, WeighingRecord>();
  readonly acceptances = new Map<string, AcceptanceRecord>();
  readonly reservations = new Map<string, Reservation>();
  readonly warehouses = new Map<string, Warehouse>();
  readonly inventoryLots = new Map<string, InventoryLot>();
  readonly movements: { lotId: string; qty: string; reason: string; fulfillmentId: string | null }[] = [];
  readonly settlements = new Map<string, Settlement>();
  readonly allocations: Allocation[] = [];
  readonly rpEntries = new Map<string, RpEntry>();
  readonly reversals: { id: string; targetType: string; targetId: string; reason: string; actorId: string }[] = [];
  readonly devices = new Map<string, { id: string; userId: string; deviceId: string; platform: string; revokedAt: string | null }>();
  readonly deletionRequests = new Map<string, { id: string; userId: string; status: string; deadlineAt: string }>();
  readonly follows: { userId: string; locationId: string }[] = [];
  readonly inbox: { id: string; userId: string; type: string; title: string; bodySafe: string; readAt: string | null; dedupKey: string | null }[] = [];
  readonly files = new Map<string, { id: string; status: string; storageKey: string; mime: string; byteSize: number; uploaderId: string; workspaceId: string | null }>();
  readonly entitlements = new Map<string, Set<string>>();
  readonly lastWorkspace = new Map<string, string>();
  readonly sequences = new Map<string, number>();
  readonly idempotency: IdempotencyRow[] = [];
  readonly operations = new Map<string, IdempotentOp>();
  readonly outbox: OutboxEvent[] = [];
  readonly feed: ChangeFeedRow[] = [];
  readonly audit: { actorId: string; action: string; resource: string; resourceId: string | null; requestId: string }[] = [];
  readonly platformAdmins = new Set<string>();

  private chain: Promise<unknown> = Promise.resolve();
  private feedId = 0;
  private outboxId = 0;

  async tx<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  now(): Date {
    return new Date();
  }

  membershipOf(userId: string, workspaceId: string): Membership | undefined {
    return [...this.memberships.values()].find(
      (m) => m.userId === userId && m.workspaceId === workspaceId,
    );
  }

  requireMember(ctx: TxCtx): Membership {
    if (ctx.isPlatform) {
      return {
        id: 'platform',
        workspaceId: ctx.workspaceId ?? '',
        userId: ctx.actorId,
        roleId: SYSTEM_ROLE_IDS.owner,
        status: 'active',
        revokedAt: null,
      };
    }
    const workspaceId = must(ctx.workspaceId, 'Thiếu workspace.', 'VALIDATION_FAILED');
    const m = this.membershipOf(ctx.actorId, workspaceId);
    if (!m || m.status !== 'active' || m.revokedAt) {
      fail('WORKSPACE_ACCESS_REVOKED', 'Không còn quyền trên không gian này.');
    }
    return must(m);
  }

  requirePermission(ctx: TxCtx, code: Permission): Membership {
    const m = this.requireMember(ctx);
    if (ctx.isPlatform) return m;
    if (!hasPermission(m.roleId, code)) {
      fail('PERMISSION_DENIED', 'Không đủ quyền.');
    }
    return m;
  }

  partyByWorkspace(workspaceId: string): Party {
    const p = must(
      [...this.parties.values()].find((x) => x.workspaceId === workspaceId),
      'Workspace chưa có hồ sơ kinh doanh.',
      'VALIDATION_FAILED',
    );
    return p;
  }

  isParticipant(orderId: string, workspaceId: string): boolean {
    return this.participants.some((p) => p.orderId === orderId && p.workspaceId === workspaceId);
  }

  requireOrderAccess(ctx: TxCtx, orderId: string): TradeOrder {
    this.requireMember(ctx);
    const order = must(this.orders.get(orderId));
    if (!ctx.workspaceId || !this.isParticipant(orderId, ctx.workspaceId)) notFound();
    return order;
  }

  nextDocumentNo(workspaceId: string, kind: string, year: number): string {
    const key = `${workspaceId}:${year}:${kind}`;
    const n = (this.sequences.get(key) ?? 0) + 1;
    this.sequences.set(key, n);
    return `${kind.toUpperCase()}-${year}-${String(n).padStart(5, '0')}`;
  }

  appendFeed(
    ctx: TxCtx,
    workspaceId: string,
    aggregateType: string,
    aggregateId: string,
    op: ChangeFeedRow['op'],
    payload: unknown,
  ): void {
    this.feed.push({
      id: ++this.feedId,
      workspaceId,
      aggregateType,
      aggregateId,
      op,
      payload,
      actorId: ctx.actorId,
    });
  }

  appendOutbox(topic: string, payload: unknown): void {
    this.outbox.push({
      id: ++this.outboxId,
      topic,
      payload,
      status: 'pending',
      attempts: 0,
      availableAt: Date.now(),
    });
  }

  auditEvent(ctx: TxCtx, action: string, resource: string, resourceId: string | null): void {
    this.audit.push({
      actorId: ctx.actorId,
      action,
      resource,
      resourceId,
      requestId: ctx.requestId,
    });
  }

  rememberIdempotency(
    ctx: TxCtx,
    commandType: string,
    key: string | undefined,
    requestHash: string,
    produce: () => unknown,
  ): unknown {
    if (!key || !ctx.workspaceId) return produce();
    const hit = this.idempotency.find(
      (r) =>
        r.workspaceId === ctx.workspaceId &&
        r.actorId === ctx.actorId &&
        r.commandType === commandType &&
        r.key === key,
    );
    if (hit) {
      if (hit.expiresAt < Date.now()) {
        this.idempotency.splice(this.idempotency.indexOf(hit), 1);
      } else if (hit.requestHash !== requestHash) {
        fail('IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key đã dùng với nội dung khác.');
      } else {
        return hit.response;
      }
    }
    const response = produce();
    this.idempotency.push({
      workspaceId: ctx.workspaceId,
      actorId: ctx.actorId,
      commandType,
      key,
      requestHash,
      response,
      expiresAt: Date.now() + 24 * 3600 * 1000,
    });
    return response;
  }

  rememberOperation(operationId: string, workspaceId: string, commandType: string, produce: () => unknown): unknown {
    const existing = this.operations.get(operationId);
    if (existing) {
      if (existing.workspaceId !== workspaceId || existing.commandType !== commandType) {
        fail('IDEMPOTENCY_KEY_REUSED', 'operationId đã dùng.');
      }
      return existing.response;
    }
    const response = produce();
    this.operations.set(operationId, { operationId, workspaceId, commandType, response });
    return response;
  }

  currentPrice(locationId: string, commodityId: string, at: Date): PriceQuote | null {
    const rows = [...this.priceQuotes.values()]
      .filter((q) => q.locationId === locationId && q.commodityId === commodityId)
      .filter((q) => new Date(q.validFrom) <= at && (!q.validTo || new Date(q.validTo) > at))
      .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1));
    return rows[0] ?? null;
  }

  nearby(input: {
    lat: number;
    lng: number;
    radiusM: number;
    commodityId?: string;
    limit: number;
    afterDistance?: number;
    afterId?: string;
  }) {
    const at = this.now();
    const rows = [...this.locations.values()]
      .filter((l) => l.publishStatus === 'published' && !l.deletedAt && l.type === 'procurement_point')
      .filter((l) => (l.lat !== null && l.lat !== undefined) && (l.lng !== null && l.lng !== undefined))
      .map((l) => {
        const distanceM = haversineM(input.lat, input.lng, l.lat as number, l.lng as number);
        const caps = this.capabilities.filter((c) => c.locationId === l.id);
        const okCommodity =
          !input.commodityId || caps.some((c) => c.commodityId === input.commodityId);
        return { location: l, distanceM, caps, okCommodity };
      })
      .filter((r) => r.okCommodity && r.distanceM <= input.radiusM)
      .filter((r) => {
        if ((input.afterDistance === null || input.afterDistance === undefined) || !input.afterId) return true;
        return (
          r.distanceM > input.afterDistance ||
          (r.distanceM === input.afterDistance && r.location.id > input.afterId)
        );
      })
      .sort((a, b) => a.distanceM - b.distanceM || a.location.id.localeCompare(b.location.id))
      .slice(0, input.limit);

    return rows.map((r) => {
      const commodityId = input.commodityId ?? r.caps[0]?.commodityId;
      const price = commodityId ? this.currentPrice(r.location.id, commodityId, at) : null;
      return {
        id: r.location.id,
        name: r.location.name,
        distanceM: Math.round(r.distanceM),
        distanceKind: 'straight_line' as const,
        currentPrice: price
          ? {
              amount: price.price,
              currency: 'VND',
              unit: price.unit,
              kind: price.priceKind,
              validTo: price.validTo,
              lastUpdatedAt: price.validFrom,
            }
          : null,
        pickupAvailable: r.caps.some((c) => c.pickupAvailable),
      };
    });
  }

  seedWorkspace(input: {
    userId: string;
    kind: Workspace['kind'];
    name: string;
    partyKind: Party['kind'];
    workspaceId?: string;
  }): { workspace: Workspace; party: Party } {
    const workspaceId = input.workspaceId ?? newId();
    const code = `${input.kind}-${workspaceId.slice(0, 8)}`;
    const workspace: Workspace = {
      id: workspaceId,
      code,
      kind: input.kind,
      name: input.name,
      status: 'active',
      ownerUserId: input.userId,
      version: 1,
    };
    this.workspaces.set(workspaceId, workspace);
    const membership: Membership = {
      id: newId(),
      workspaceId,
      userId: input.userId,
      roleId: SYSTEM_ROLE_IDS.owner,
      status: 'active',
      revokedAt: null,
    };
    this.memberships.set(membership.id, membership);
    const party: Party = {
      id: newId(),
      workspaceId,
      displayName: input.name,
      kind: input.partyKind,
    };
    this.parties.set(party.id, party);
    this.entitlements.set(workspaceId, new Set(['sync.write', 'listings.publish']));
    return { workspace, party };
  }

  drainOutbox(limit = 50): OutboxEvent[] {
    const batch = this.outbox
      .filter((e) => e.status === 'pending' && e.availableAt <= Date.now())
      .slice(0, limit);
    for (const e of batch) {
      e.status = 'processing';
      e.attempts += 1;
    }
    return batch;
  }

  completeOutbox(id: number, ok: boolean): void {
    const e = this.outbox.find((x) => x.id === id);
    if (!e) return;
    if (ok) {
      e.status = 'done';
      return;
    }
    e.status = e.attempts >= 8 ? 'dead' : 'pending';
    e.availableAt = Date.now() + 1000 * 2 ** Math.min(e.attempts, 6);
  }

  entitlementAllows(workspaceId: string, code: string): boolean {
    return this.entitlements.get(workspaceId)?.has(code) ?? true;
  }

  requireEntitlement(workspaceId: string, code: string): void {
    if (!this.entitlementAllows(workspaceId, code)) {
      throw new AppError('PLAN_LIMIT_REACHED', 'Gói dịch vụ không cho phép thao tác này. Dữ liệu vẫn giữ.');
    }
  }
}

export const createEmptyPlatform = (): MemoryPlatform => new MemoryPlatform();
