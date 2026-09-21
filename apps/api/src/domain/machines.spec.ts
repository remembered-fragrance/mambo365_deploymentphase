import { describe, expect, it } from 'vitest';
import { canAcceptQuote } from './machines';
import { AppError } from './errors';

describe('canAcceptQuote', () => {
  it('rejects expired', () => {
    expect(() =>
      canAcceptQuote('sent', '2020-01-01T00:00:00.000Z', new Date('2026-01-01')),
    ).toThrow(AppError);
    try {
      canAcceptQuote('sent', '2020-01-01T00:00:00.000Z', new Date('2026-01-01'));
    } catch (e) {
      expect((e as AppError).code).toBe('QUOTE_EXPIRED');
    }
  });

  it('rejects draft', () => {
    try {
      canAcceptQuote('draft', null, new Date());
    } catch (e) {
      expect((e as AppError).code).toBe('INVALID_STATE_TRANSITION');
    }
  });
});
