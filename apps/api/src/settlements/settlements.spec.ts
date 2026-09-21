import { describe, expect, it } from 'vitest';
import { AppError } from '../domain/errors';
import { ctx, harness, onboard } from '../test/harness';

describe('settlements', () => {
  it('A11-A13: confirm + allocate idempotent, không vượt số dư', async () => {
    const h = harness();
    const trader = await onboard(h, 'acc-1', 'trader', 'Vựa');
    const ws = trader.workspace.id;
    const c = ctx('acc-1', ws);

    const declared = await h.settlements.declare(c, {
      direction: 'out',
      amount: '1000000',
      valueDate: '2026-09-18',
      operationId: '11111111-1111-4111-8111-ccccccccccc1',
    });
    const replay = await h.settlements.declare(c, {
      direction: 'out',
      amount: '1000000',
      valueDate: '2026-09-18',
      operationId: '11111111-1111-4111-8111-ccccccccccc1',
    });
    expect(replay).toEqual(declared);

    await h.settlements.confirm(c, declared.id);
    await h.settlements.allocate(c, declared.id, {
      amount: '600000',
      orderId: '11111111-1111-4111-8111-ddddddddddd1',
      operationId: '11111111-1111-4111-8111-eeeeeeeeeee1',
    });
    try {
      await h.settlements.allocate(c, declared.id, { amount: '500000' });
      throw new Error('expected');
    } catch (e) {
      expect((e as AppError).code).toBe('VALIDATION_FAILED');
    }

    const reversed = await h.settlements.reverse(c, declared.id, 'sai bút toán');
    expect(reversed.status).toBe('reversed');
    expect(h.db.settlements.get(declared.id)?.amount).toBe('1000000');
  });
});
