import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type Client } from '@mambo/sdk';
import { apiForOrg } from '@/data/client';
import { openLocalDb } from '@/data/localDb';
import { clearQueue, enqueue, MAX_REJECTED_TRIES, opInsert, opUpdate, pendingOps, type QueuedOp } from '@/data/queue';
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

  it.each(['INTERNAL', 'PARENT_MISSING'] as const)('máy chủ trả %s mãi thì thành kẹt, không thử lại im lặng', async (code) => {
    const op = await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({
      results: [{ opId: op.opId, status: 'rejected', error: { code, message: 'Lỗi' } }],
    });
    const client = clientWithPush(push);
    expect((await flushQueue('device', 'org-a', client)).conflicts).toEqual([]);
    expect((await pendingOps('org-a'))[0]?.tries).toBe(1);

    await dueAgain(MAX_REJECTED_TRIES - 1);
    expect((await flushQueue('device', 'org-a', client)).conflicts).toEqual(['a']);
    expect((await pendingOps('org-a'))[0]?.conflict?.code).toBe(code);
  });

  it('máy chủ bận (RATE_LIMITED) thì thử lại mãi', async () => {
    const op = await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({
      results: [{ opId: op.opId, status: 'rejected', error: { code: 'RATE_LIMITED', message: 'Bận' } }],
    });
    await dueAgain(MAX_REJECTED_TRIES + 3);
    expect((await flushQueue('device', 'org-a', clientWithPush(push))).conflicts).toEqual([]);
    expect((await pendingOps('org-a'))[0]?.conflict).toBeUndefined();
  });

  it('phiếu của chi nhánh cũ: tự bỏ thao tác đó, gửi tiếp các thao tác sau ngay trong lượt', async () => {
    const old = await enqueue({ ...opUpdate('transaction', 'old', { note: 'x' }), orgId: 'org-a' });
    await enqueue({ ...opUpdate('transaction', 'old', { note: 'y' }), orgId: 'org-a' });
    const fresh = await enqueue({ ...opInsert('note', 'fresh', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>()
      .mockResolvedValueOnce({
        results: [{
          opId: old.opId, status: 'rejected',
          error: { code: 'FORBIDDEN', message: 'Chi nhánh khác', details: { reason: 'BRANCH_SCOPE' } },
        }],
      })
      .mockResolvedValueOnce({ results: [{ opId: fresh.opId, status: 'applied' }] });
    const result = await flushQueue('device', 'org-a', clientWithPush(push));
    expect(result).toMatchObject({ dropped: 2, pushed: 1, conflicts: [] });
    expect(await pendingOps('org-a')).toEqual([]);
  });
});

describe('op mặt hàng mẫu kiểu cũ', () => {
  it('bản app cũ lỡ xếp vào hàng đợi thì tự gỡ, không gửi, không chặn op sau', async () => {
    await enqueue({ ...opUpdate('product', 'prod-rubber', { lastPricePerUnit: 1 }), orgId: 'org-a' });
    const note = await enqueue({ ...opInsert('note', 'n', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({ results: [{ opId: note.opId, status: 'applied' }] });
    expect((await flushQueue('device', 'org-a', clientWithPush(push))).pushed).toBe(1);
    expect(push.mock.calls[0]?.[0].ops.map((op) => op.recordId)).toEqual(['n']);
    expect(await pendingOps('org-a')).toEqual([]);
  });
});

/** Đưa mọi thao tác về hạn gửi, như đã thử `tries` lần. */
const dueAgain = async (tries: number): Promise<void> => {
  const db = await openLocalDb();
  for (const op of await pendingOps('org-a')) {
    await db.put('queue', { ...op, tries, nextAttemptAt: new Date(0).toISOString() } satisfies QueuedOp);
  }
};
