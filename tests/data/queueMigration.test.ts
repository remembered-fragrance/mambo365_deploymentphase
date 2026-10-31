import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';

describe('queue schema migration', () => {
  it('preserves legacy operations separately and repairs a missing seq index', async () => {
    const old = await openDB('thumua365', 1, {
      upgrade(db) {
        db.createObjectStore('queue', { keyPath: 'id' }).createIndex('createdAt', 'createdAt');
      },
    });
    const legacy = { id: 'legacy', table: 'notes', recordId: 'n', payload: { user_id: 'user-a' } };
    const scoped = {
      id: 'scoped', opId: 'scoped', orgId: 'org-a', entity: 'note', kind: 'insert',
      recordId: 'safe', seq: 1, createdAt: '', nextAttemptAt: '', tries: 0,
    };
    await old.put('queue', legacy);
    await old.put('queue', { ...scoped, id: 'missing-opid', opId: undefined });
    await old.put('queue', scoped);
    old.close();
    const { openLocalDb } = await import('@/data/localDb');
    const db = await openLocalDb();
    expect(await db.get('legacyQueue', 'legacy')).toEqual(legacy);
    expect(await db.count('legacyQueue')).toBe(2);
    expect(await db.getAllFromIndex('queue', 'seq')).toEqual([scoped]);
    const { pendingOps } = await import('@/data/queue');
    expect(await pendingOps('org-b')).toEqual([]);
    expect(await pendingOps('org-a')).toEqual([scoped]);
  });
});
