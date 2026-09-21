import { AppError } from '../domain/errors';
import type { FormulaType } from '../domain/money';
import type {
  AppointmentStatus,
  FulfillmentStatus,
  ListingStatus,
  LocationPublish,
  OrderStatus,
  QuoteStatus,
  SettlementStatus,
} from '../domain/machines';

export type WorkspaceKind = 'personal_farm' | 'trader' | 'enterprise';
export type PartyKind = 'farmer' | 'trader' | 'enterprise';

export interface TxCtx {
  readonly actorId: string;
  readonly workspaceId: string | null;
  readonly requestId: string;
  readonly isPlatform?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  recoveryEmail: string | null;
  businessName: string | null;
  status: 'active' | 'disabled' | 'pending_deletion' | 'deleted';
  locale: string;
  phoneVerifiedAt: string | null;
  emailVerifiedAt: string | null;
}

export interface Workspace {
  id: string;
  code: string;
  kind: WorkspaceKind;
  name: string;
  status: 'active' | 'suspended' | 'closed';
  ownerUserId: string;
  version: number;
}

export interface Membership {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  status: 'invited' | 'active' | 'revoked';
  revokedAt: string | null;
}

export interface Party {
  id: string;
  workspaceId: string;
  displayName: string;
  kind: PartyKind;
}

export interface Farm {
  id: string;
  workspaceId: string;
  name: string;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  geoVisibility: 'hidden' | 'approximate' | 'exact_to_counterparty' | 'public';
  version: number;
}

export interface HarvestLot {
  id: string;
  farmId: string;
  workspaceId: string;
  commodityId: string;
  harvestedQty: string;
  reservedQty: string;
  deliveredQty: string;
  status: 'open' | 'closed';
  version: number;
}

export interface Location {
  id: string;
  workspaceId: string;
  type: 'procurement_point' | 'warehouse' | 'delivery' | 'farm_gate';
  name: string;
  addressText: string;
  lat: number | null;
  lng: number | null;
  publicContactName: string | null;
  publicPhone: string | null;
  verificationStatus: 'unverified' | 'verified' | 'rejected';
  publishStatus: LocationPublish;
  version: number;
  deletedAt: string | null;
}

export interface Capability {
  locationId: string;
  commodityId: string;
  pickupAvailable: boolean;
}

export interface PriceQuote {
  id: string;
  locationId: string;
  workspaceId: string;
  commodityId: string;
  price: string;
  unit: string;
  priceKind: 'reference' | 'conditional_commit';
  validFrom: string;
  validTo: string | null;
}

export interface Listing {
  id: string;
  workspaceId: string;
  harvestLotId: string | null;
  commodityId: string;
  qty: string;
  unit: string;
  desiredPrice: string | null;
  negotiable: boolean;
  deliveryMode: 'pickup' | 'dropoff' | 'either';
  status: ListingStatus;
  expiresAt: string | null;
  version: number;
}

export interface Quotation {
  id: string;
  listingId: string | null;
  buyRequestId: string | null;
  fromPartyId: string;
  toPartyId: string;
  currentRevisionId: string | null;
  version: number;
}

export interface QuoteRevision {
  id: string;
  quotationId: string;
  revisionNo: number;
  status: QuoteStatus;
  expiresAt: string | null;
}

export interface QuoteLine {
  id: string;
  revisionId: string;
  commodityId: string;
  qty: string;
  unit: string;
  unitPrice: string;
  formulaType: FormulaType;
  formulaInputs: Record<string, string>;
}

export interface TradeOrder {
  id: string;
  status: OrderStatus;
  sourceRevisionId: string | null;
  buyerPartyId: string;
  sellerPartyId: string;
  issuerWorkspaceId: string;
  documentNo: string | null;
  version: number;
  termsSnapshot: Record<string, unknown>;
}

export interface OrderLine {
  id: string;
  orderId: string;
  commodityId: string;
  qty: string;
  unit: string;
  unitPrice: string;
  formulaType: FormulaType;
  formulaInputs: Record<string, string>;
  lineTotal: string;
}

export interface OrderParticipant {
  orderId: string;
  partyId: string;
  workspaceId: string;
  side: 'buyer' | 'seller';
}

export interface Appointment {
  id: string;
  orderId: string;
  locationId: string;
  proposedAt: string;
  status: AppointmentStatus;
  version: number;
}

export interface Fulfillment {
  id: string;
  orderId: string;
  appointmentId: string | null;
  sequence: number;
  expectedQty: string;
  status: FulfillmentStatus;
  version: number;
}

export interface WeighingRecord {
  id: string;
  fulfillmentId: string;
  grossWeight: string;
  tareWeight: string;
  formulaType: FormulaType;
  formulaInputs: Record<string, string>;
  physicalQty: string;
  payableQty: string;
}

export interface AcceptanceRecord {
  id: string;
  fulfillmentId: string;
  qtyAccepted: string;
  qtyRejected: string;
  posted: boolean;
}

export interface Reservation {
  id: string;
  harvestLotId: string | null;
  lotId: string | null;
  workspaceId: string;
  orderId: string;
  qty: string;
  status: 'active' | 'released' | 'consumed' | 'expired';
  expiresAt: string;
}

export interface InventoryLot {
  id: string;
  warehouseId: string;
  workspaceId: string;
  commodityId: string;
  qtyOnHand: string;
  qtyReserved: string;
  origin: 'harvest' | 'purchase' | 'legacy_opening';
  version: number;
}

export interface Warehouse {
  id: string;
  workspaceId: string;
  locationId: string | null;
  name: string;
}

export interface Settlement {
  id: string;
  workspaceId: string;
  direction: 'in' | 'out';
  amount: string;
  status: SettlementStatus;
  declaredBy: string;
  valueDate: string;
  version: number;
}

export interface RpEntry {
  id: string;
  workspaceId: string;
  partyId: string | null;
  side: 'receivable' | 'payable';
  amount: string;
  source: 'legacy_receipt' | 'trade_order' | 'manual';
  sourceId: string | null;
  dueDate: string | null;
  status: 'open' | 'closed';
}

export interface Allocation {
  id: string;
  settlementId: string;
  workspaceId: string;
  entryId: string | null;
  orderId: string | null;
  amount: string;
}

export interface OutboxEvent {
  id: number;
  topic: string;
  payload: unknown;
  status: 'pending' | 'processing' | 'done' | 'dead';
  attempts: number;
  availableAt: number;
}

export interface ChangeFeedRow {
  id: number;
  workspaceId: string;
  aggregateType: string;
  aggregateId: string;
  op: 'upsert' | 'delete' | 'reverse';
  payload: unknown;
  actorId: string;
}

export interface IdempotencyRow {
  workspaceId: string;
  actorId: string;
  commandType: string;
  key: string;
  requestHash: string;
  response: unknown;
  expiresAt: number;
}

export interface IdempotentOp {
  operationId: string;
  workspaceId: string;
  commandType: string;
  response: unknown;
}

export const notFound = (): never => {
  throw new AppError('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
};
