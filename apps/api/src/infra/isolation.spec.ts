import { describe, expect, it } from 'vitest';
import { AppError } from '../domain/errors';
import { ctx, harness, onboard } from '../test/harness';

describe('workspace isolation', () => {
  it('A02: member workspace B không đọc farm workspace A', async () => {
    const h = harness();
    const farmer = await onboard(h, 'user-farmer', 'farmer', 'Hộ A');
    const trader = await onboard(h, 'user-trader', 'trader', 'Vựa B');
    await h.market.createFarm(ctx('user-farmer', farmer.workspace.id), { name: 'Rẫy 1' });
    expect(() => h.market.listFarms(ctx('user-trader', farmer.workspace.id))).toThrow(AppError);
    expect(h.market.listFarms(ctx('user-trader', trader.workspace.id))).toEqual([]);
  });

  it('đổi X-Workspace-Id giả → WORKSPACE_ACCESS_REVOKED', async () => {
    const h = harness();
    await onboard(h, 'user-farmer', 'farmer', 'Hộ A');
    try {
      h.market.listFarms(ctx('user-farmer', '00000000-0000-4000-8000-000000000099'));
      throw new Error('expected throw');
    } catch (e) {
      expect((e as AppError).code).toBe('WORKSPACE_ACCESS_REVOKED');
    }
  });
});
