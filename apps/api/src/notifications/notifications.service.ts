import { Injectable } from '@nestjs/common';
import { must } from '../domain/errors';
import { MemoryPlatform } from '../infra/memory.platform';
import type { TxCtx } from '../infra/types';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: MemoryPlatform) {}

  list(userId: string) {
    return this.db.inbox.filter((n) => n.userId === userId);
  }

  read(userId: string, id: string) {
    const n = must(this.db.inbox.find((x) => x.id === id && x.userId === userId));
    n.readAt = new Date().toISOString();
    return n;
  }

  enqueue(userId: string, type: string, title: string, bodySafe: string, dedupKey: string) {
    if (this.db.inbox.some((n) => n.userId === userId && n.dedupKey === dedupKey)) return;
    this.db.inbox.push({
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      bodySafe,
      readAt: null,
      dedupKey,
    });
  }

  voidCtx(_ctx: TxCtx): void {
    /* preferences later */
  }
}
