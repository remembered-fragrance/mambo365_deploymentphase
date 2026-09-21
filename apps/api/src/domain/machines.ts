import { fail } from './errors';

export const LISTING_STATUSES = [
  'draft',
  'published',
  'paused',
  'fulfilled',
  'expired',
  'cancelled',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'countered',
  'accepted',
  'rejected',
  'expired',
  'withdrawn',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const ORDER_STATUSES = [
  'draft',
  'pending_acceptance',
  'confirmed',
  'in_fulfillment',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  'proposed',
  'confirmed',
  'rescheduled',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'superseded',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  'expected',
  'weighed',
  'qc',
  'accepted',
  'partially_accepted',
  'rejected',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const SETTLEMENT_STATUSES = ['declared', 'posted', 'rejected', 'reversed'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const LOCATION_PUBLISH = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'suspended',
  'closed',
] as const;
export type LocationPublish = (typeof LOCATION_PUBLISH)[number];

const assert = (ok: boolean, from: string, to: string): void => {
  if (!ok) fail('INVALID_STATE_TRANSITION', `Không chuyển được ${from} → ${to}.`);
};

export const listingTransition = (from: ListingStatus, to: ListingStatus): void => {
  const allowed: Record<ListingStatus, ListingStatus[]> = {
    draft: ['published', 'cancelled'],
    published: ['paused', 'fulfilled', 'expired', 'cancelled'],
    paused: ['published', 'cancelled'],
    fulfilled: [],
    expired: [],
    cancelled: [],
  };
  assert(allowed[from].includes(to), from, to);
};

export const canAcceptQuote = (status: QuoteStatus, expiresAt: string | null, now: Date): void => {
  if (status !== 'sent' && status !== 'countered') {
    fail('INVALID_STATE_TRANSITION', 'Báo giá không ở trạng thái có thể chấp nhận.');
  }
  if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
    fail('QUOTE_EXPIRED', 'Báo giá đã hết hạn.');
  }
};

export const orderTransition = (from: OrderStatus, to: OrderStatus): void => {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    draft: ['pending_acceptance', 'cancelled'],
    pending_acceptance: ['confirmed', 'cancelled'],
    confirmed: ['in_fulfillment', 'cancelled', 'completed'],
    in_fulfillment: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };
  assert(allowed[from].includes(to), from, to);
};

export const appointmentTransition = (from: AppointmentStatus, to: AppointmentStatus): void => {
  const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
    proposed: ['confirmed', 'cancelled', 'superseded'],
    confirmed: ['checked_in', 'rescheduled', 'cancelled', 'no_show', 'superseded'],
    rescheduled: [],
    checked_in: ['completed', 'cancelled', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
    superseded: [],
  };
  assert(allowed[from].includes(to), from, to);
};

export const fulfillmentTransition = (from: FulfillmentStatus, to: FulfillmentStatus): void => {
  const allowed: Record<FulfillmentStatus, FulfillmentStatus[]> = {
    expected: ['weighed', 'rejected'],
    weighed: ['qc', 'rejected'],
    qc: ['accepted', 'partially_accepted', 'rejected'],
    accepted: [],
    partially_accepted: [],
    rejected: [],
  };
  assert(allowed[from].includes(to), from, to);
};

export const settlementTransition = (from: SettlementStatus, to: SettlementStatus): void => {
  const allowed: Record<SettlementStatus, SettlementStatus[]> = {
    declared: ['posted', 'rejected'],
    posted: ['reversed'],
    rejected: [],
    reversed: [],
  };
  assert(allowed[from].includes(to), from, to);
};

export const locationPublishTransition = (from: LocationPublish, to: LocationPublish): void => {
  const allowed: Record<LocationPublish, LocationPublish[]> = {
    draft: ['pending_review'],
    pending_review: ['published', 'rejected'],
    published: ['suspended', 'closed', 'pending_review'],
    rejected: ['draft', 'pending_review'],
    suspended: ['published', 'closed'],
    closed: [],
  };
  assert(allowed[from].includes(to), from, to);
};
