import { describe, expect, it } from 'vitest';
import { OrdersService } from '../orders/orders.service';
import { SyncService } from './sync.service';
import { ctx, harness, onboard } from '../test/harness';

describe('sync commands', () => {
  it('A07: cấm table name; duplicate operationId không ghi hai lần', async () => {
    const h = harness();
    const trader = await onboard(h, 'sync-1', 'trader', 'Vựa');
    const sync = new SyncService(h.db);
    const c = ctx('sync-1', trader.workspace.id);
    const body = {
      deviceId: 'dev-1',
      workspaceId: trader.workspace.id,
      commands: [
        {
          operationId: '11111111-1111-4111-8111-ffff00000001',
          type: 'settlement.declare',
          aggregateId: '11111111-1111-4111-8111-ffff00000002',
          expectedVersion: 0,
          clientCreatedAt: new Date().toISOString(),
          dependsOn: [] as string[],
          payload: { direction: 'out', amount: '5000', valueDate: '2026-09-18' },
        },
      ],
    };
    const r1 = await sync.commands(c, body, {
      'settlement.declare': (cmd, cx) =>
        h.settlements.declare(cx, {
          direction: 'out',
          amount: String(cmd.payload.amount),
          valueDate: String(cmd.payload.valueDate),
          operationId: cmd.operationId,
        }),
    });
    const r2 = await sync.commands(c, body, {
      'settlement.declare': (cmd, cx) =>
        h.settlements.declare(cx, {
          direction: 'out',
          amount: String(cmd.payload.amount),
          valueDate: String(cmd.payload.valueDate),
          operationId: cmd.operationId,
        }),
    });
    expect(r1.results[0].status).toBe('accepted');
    expect(r2.results[0].status).toBe('already_processed');
    expect([...h.db.settlements.values()]).toHaveLength(1);

    const bad = await sync.commands(
      c,
      {
        deviceId: 'dev-1',
        workspaceId: trader.workspace.id,
        commands: [
          {
            operationId: '11111111-1111-4111-8111-ffff00000009',
            type: 'transactions.upsert',
            aggregateId: 'x',
            expectedVersion: 0,
            clientCreatedAt: new Date().toISOString(),
            dependsOn: [],
            payload: { table: 'transactions' },
          },
        ],
      },
      {},
    );
    expect(bad.results[0].status).toBe('rejected');
    void OrdersService;
  });
});
