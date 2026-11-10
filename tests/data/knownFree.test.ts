import { describe, expect, it } from 'vitest';
import type { PlanState, Subscription } from '@mambo/core/subscription';
import { knownFree } from '@/data/hooks/useSubscription';

const FREE: PlanState = { tier: 'free', premium: false, daysLeft: 0 };
const TRIAL: PlanState = { tier: 'trial', premium: true, endsAt: '2026-12-10T00:00:00.000Z', daysLeft: 60 };
const SUB: Subscription = { id: 's1', status: 'trialing', trialEndsAt: '2026-12-10T00:00:00.000Z' };

/** Hạn mức hết hạn là 0 phiếu (chỉ xem) — chặn nhầm lúc chưa tải được gói là chặn người đang dùng thử. */
describe('chỉ chặn ghi phiếu khi biết chắc gói đã hết', () => {
  it('đã tải gói: theo bậc gói', () => {
    expect(knownFree(FREE, { ...SUB, status: 'canceled' }, 'trial')).toBe(true);
    expect(knownFree(TRIAL, SUB, 'free')).toBe(false);
  });

  it('chưa tải được gói (máy mới, API đang khởi động): theo gói của /v1/me', () => {
    expect(knownFree(FREE, null, 'trial')).toBe(false);
    expect(knownFree(FREE, null, 'premium')).toBe(false);
    expect(knownFree(FREE, null, 'free')).toBe(true);
  });

  it('chưa biết gì cả → không chặn', () => {
    expect(knownFree(FREE, null, null)).toBe(false);
    expect(knownFree(FREE, null, undefined)).toBe(false);
  });
});
