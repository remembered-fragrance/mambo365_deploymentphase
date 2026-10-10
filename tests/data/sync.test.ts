import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type Client } from '@mambo/sdk';
import { apiForOrg } from '@/data/client';
import { clearQueue, enqueue, opInsert, pendingOps } from '@/data/queue';
import { flushQueue } from '@/data/sync';

beforeEach(clearQueue);

const clientWithPush = (push: Client['sync']['push']): Client => {
  const client = apiForOrg('org-a');
  return { ...client, sync: { ...client.sync, push } };
};

describe('sync organization and retry handling', () => {
  it('pushes and removes only operations for the requested organization', async () => {
    const a = await enqueue({ ...opInsert('note', 'a', { body: 'A' }), orgId: 'org-a' });
    await enqueue({ ...opInsert('note', 'b', { body: 'B' }), orgId: 'org-b' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({
      results: [{ opId: a.opId, status: 'applied' }],
    });
    expect((await flushQueue('device', 'org-a', clientWithPush(push))).pushed).toBe(1);
    expect(push.mock.calls[0]?.[0].ops.map((op) => op.recordId)).toEqual(['a']);
    expect(await pendingOps('org-a')).toEqual([]);
    expect(await pendingOps('org-b')).toHaveLength(1);
  });

  it.each([
    new TypeError('fetch failed'),
    new ApiError('INTERNAL', 503, 'Unavailable'),
    new ApiError('RATE_LIMITED', 429, 'Slow down'),
  ])('backs off retryable request failures: %s', async (error) => {
    await enqueue({ ...opInsert('note', 'a', { body: 'A' }), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(error);
    const client = clientWithPush(push);
    await flushQueue('device', 'org-a', client);
    const [op] = await pendingOps('org-a');
    expect(op?.tries).toBe(1);
    expect(Date.parse(op?.nextAttemptAt ?? '')).toBeGreaterThan(Date.now());
    await flushQueue('device', 'org-a', client);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('keeps plan-blocked operations without consuming retries', async () => {
    await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(new ApiError('PLAN_EXPIRED', 403, 'Expired'));
    expect((await flushQueue('device', 'org-a', clientWithPush(push))).blocked).toBe(true);
    expect((await pendingOps('org-a'))[0]?.tries).toBe(0);
  });

  it('marks permanent failures as conflicts and stops dependent operations', async () => {
    await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    await enqueue({ ...opInsert('note', 'dependent', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(new ApiError('FORBIDDEN', 403, 'Denied'));
    const client = clientWithPush(push);
    expect((await flushQueue('device', 'org-a', client)).conflicts).toEqual(['a']);
    await flushQueue('device', 'org-a', client);
    expect(push).toHaveBeenCalledTimes(1);
    expect(await pendingOps('org-a')).toHaveLength(2);
  });
});
