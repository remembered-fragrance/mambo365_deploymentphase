/**
 * Ghi settlement + allocate trong MỘT transaction, idempotent theo operationId.
 * CHƯA CHẠY. Khớp ADR-004 Drizzle + ADR-009 outbox. Decimal string vào numeric.
 */
import { sql } from 'drizzle-orm';

export async function postAndAllocate(
  db: { transaction: (fn: (tx: { execute: (q: unknown) => Promise<unknown> }) => Promise<void>) => Promise<void> },
  input: {
    operationId: string;
    settlementId: string;
    workspaceId: string;
    actorId: string;
    amount: string;
    entryId: string;
    allocAmount: string;
  },
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor_id', ${input.actorId}, true)`);
    await tx.execute(sql`select set_config('app.workspace_id', ${input.workspaceId}, true)`);

    await tx.execute(sql`
      insert into idempotent_operations (operation_id, workspace_id, command_type)
      values (${input.operationId}::uuid, ${input.workspaceId}::uuid, 'settlement.post_allocate')
    `);

    await tx.execute(sql`
      insert into settlements (id, workspace_id, amount, status, created_by)
      values (
        ${input.settlementId}::uuid,
        ${input.workspaceId}::uuid,
        ${input.amount}::numeric,
        'posted',
        ${input.actorId}::uuid
      )
    `);

    await tx.execute(sql`
      select id from settlements where id = ${input.settlementId}::uuid for update
    `);

    await tx.execute(sql`
      insert into settlement_allocations (id, settlement_id, entry_id, amount)
      values (gen_random_uuid(), ${input.settlementId}::uuid, ${input.entryId}::uuid, ${input.allocAmount}::numeric)
    `);

    await tx.execute(sql`
      insert into outbox_events (topic, payload, status)
      values (
        'settlement.posted',
        jsonb_build_object('workspaceId', ${input.workspaceId}, 'settlementId', ${input.settlementId}),
        'pending'
      )
    `);

    await tx.execute(sql`
      insert into change_feed (workspace_id, aggregate_type, aggregate_id, op, payload, actor_id)
      values (
        ${input.workspaceId}::uuid,
        'settlement',
        ${input.settlementId}::uuid,
        'upsert',
        '{}'::jsonb,
        ${input.actorId}::uuid
      )
    `);
  });
}
