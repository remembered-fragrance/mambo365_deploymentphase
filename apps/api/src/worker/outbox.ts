import type { MemoryPlatform } from '../infra/memory.platform';
import type { NotificationsService } from '../notifications/notifications.service';

export const drainOutbox = async (
  db: MemoryPlatform,
  notify: NotificationsService,
  send: (topic: string, payload: unknown) => Promise<void> = async () => undefined,
): Promise<void> => {
  const batch = db.drainOutbox(50);
  for (const row of batch) {
    try {
      await send(row.topic, row.payload);
      const payload = row.payload as { userId?: string; orderId?: string };
      if (typeof payload.userId === 'string') {
        notify.enqueue(payload.userId, row.topic, row.topic, 'Có cập nhật giao dịch.', `${row.topic}:${row.id}`);
      }
      db.completeOutbox(row.id, true);
    } catch {
      db.completeOutbox(row.id, false);
    }
  }
};
