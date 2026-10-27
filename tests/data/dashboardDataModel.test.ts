import { describe, expect, it } from 'vitest';
import { firstDashboardError, setDashboardSourceError } from '@/data/dashboardDataModel';

describe('dashboard source errors', () => {
  it('keeps report, order and linked failures independent', () => {
    const errors = setDashboardSourceError(
      setDashboardSourceError({}, 'orders', 'orders unavailable'),
      'report',
      'report unavailable',
    );

    expect(errors).toEqual({ orders: 'orders unavailable', report: 'report unavailable' });
    expect(errors.linked).toBeUndefined();
  });

  it('returns a retryable error without masking other source errors', () => {
    const errors = setDashboardSourceError(
      setDashboardSourceError({}, 'linked', 'linked unavailable'),
      'orders',
      'orders unavailable',
    );

    expect(firstDashboardError(errors)).toBe('orders unavailable');
    expect(errors.linked).toBe('linked unavailable');
  });
});
