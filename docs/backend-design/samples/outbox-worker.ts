/**
 * Outbox worker — poll FOR UPDATE SKIP LOCKED, gửi push SAU commit.
 * CHƯA CHẠY. Retry không insert settlement/movement.
 */
import { sql } from 'drizzle-orm';

export async function drainOutbox(
  db: { transaction: Function },
  send: (topic: string, payload: unknown) => Promise<void>,
) {
  const batch = await db.transaction(async (tx: { execute: Function }) => {
    const rows = await tx.execute(sql`
      select id, topic, payload, attempts
      from outbox_events
      where status = 'pending' and available_at <= now()
      order by id
      limit 50
      for update skip locked
    `);
    const items = (rows as { id: string; topic: string; payload: unknown; attempts: number }[]) ?? [];
    for (const row of items) {
      await tx.execute(sql`
        update outbox_events set status = 'processing', attempts = attempts + 1
        where id = ${row.id}
      `);
    }
    return items;
  });

  for (const row of batch) {
    try {
      await send(row.topic, row.payload);
      await db.transaction(async (tx: { execute: Function }) => {
        await tx.execute(sql`update outbox_events set status = 'done' where id = ${row.id}`);
      });
    } catch {
      await db.transaction(async (tx: { execute: Function }) => {
        await tx.execute(sql`
          update outbox_events
          set status = case when attempts >= 8 then 'dead' else 'pending' end,
              available_at = now() + (interval '1 second' * power(2, least(attempts, 6)))
          where id = ${row.id}
        `);
      });
    }
  }
}
