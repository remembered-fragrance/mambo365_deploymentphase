import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SYNC_PUSH_MAX_BYTES } from '@mambo/contracts';
import { ApiError, type Client } from '@mambo/sdk';
import { apiForOrg } from '@/data/client';
import { openLocalDb } from '@/data/localDb';
import {
  clearQueue, enqueue, MAX_REJECTED_TRIES, markConflict, opInsert, opUpdate, pendingOps, type QueuedOp,
} from '@/data/queue';
import { flushQueue } from '@/data/sync';

beforeEach(clearQueue);
afterEach(() => vi.unstubAllGlobals());

/** Web Locks tối giản (một hàng chờ mỗi tên) cho Node chưa có `navigator.locks`. */
const fifoLocks = () => {
  const tails = new Map<string, Promise<unknown>>();
  return {
    request: <T>(name: string, task: () => Promise<T>): Promise<T> => {
      const run = (tails.get(name) ?? Promise.resolve()).then(task, task);
      tails.set(name, run.catch(() => undefined));
      return run;
    },
  };
};
beforeEach(() => {
  if (!globalThis.navigator?.locks) vi.stubGlobal('navigator', { ...globalThis.navigator, locks: fifoLocks() });
});

/** Máy chủ bắt deviceId là UUID — sai là cả lượt 422. */
const DEVICE = '0b7f3c2e-5d1a-4e8b-9c6f-2a4d8e1f3b5c';

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
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).pushed).toBe(1);
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
    expect((await flushQueue(DEVICE, 'org-a', client)).refused).toBeUndefined();
    const [op] = await pendingOps('org-a');
    expect(op?.tries).toBe(1);
    expect(Date.parse(op?.nextAttemptAt ?? '')).toBeGreaterThan(Date.now());
    await flushQueue(DEVICE, 'org-a', client);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('keeps plan-blocked operations without consuming retries', async () => {
    await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(new ApiError('PLAN_EXPIRED', 403, 'Expired'));
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).blocked).toBe(true);
    expect((await pendingOps('org-a'))[0]?.tries).toBe(0);
  });

  it.each([
    new ApiError('NOT_A_MEMBER', 403, 'Bạn không thuộc tổ chức này'),
    new ApiError('FORBIDDEN', 403, 'Denied'),
    new ApiError('VALIDATION_FAILED', 422, 'Vỏ request sai'),
    new ApiError('CONTRACT_MISMATCH', 200, 'Sai hợp đồng'),
  ])('cả lượt bị từ chối (%s): không gắn cờ kẹt op nào, giữ nguyên hàng đợi', async (error) => {
    await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    await enqueue({ ...opInsert('note', 'dependent', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(error);
    const client = clientWithPush(push);
    const result = await flushQueue(DEVICE, 'org-a', client);
    expect(result.conflicts).toEqual([]);
    expect(result.error).toContain(error.message);
    // Không phải mất mạng: giao diện phải nói đúng là máy chủ chưa nhận.
    expect(result.refused).toBe(true);
    const ops = await pendingOps('org-a');
    expect(ops.map((op) => op.recordId)).toEqual(['a', 'dependent']);
    expect(ops.every((op) => !op.conflict && !op.rejectedTries)).toBe(true);
    // Hẹn lại cả lượt, không dội máy chủ mỗi lần đồng bộ.
    await flushQueue(DEVICE, 'org-a', client);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it.each(['INTERNAL', 'PARENT_MISSING'] as const)('máy chủ trả %s mãi thì thành kẹt, không thử lại im lặng', async (code) => {
    const op = await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({
      results: [{ opId: op.opId, status: 'rejected', error: { code, message: 'Lỗi' } }],
    });
    const client = clientWithPush(push);
    expect((await flushQueue(DEVICE, 'org-a', client)).conflicts).toEqual([]);
    expect((await pendingOps('org-a'))[0]?.tries).toBe(1);

    await dueAgain(MAX_REJECTED_TRIES - 1);
    expect((await flushQueue(DEVICE, 'org-a', client)).conflicts).toEqual(['a']);
    expect((await pendingOps('org-a'))[0]?.conflict?.code).toBe(code);
  });

  it('máy chủ bận (RATE_LIMITED) thì thử lại mãi', async () => {
    const op = await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({
      results: [{ opId: op.opId, status: 'rejected', error: { code: 'RATE_LIMITED', message: 'Bận' } }],
    });
    await dueAgain(MAX_REJECTED_TRIES + 3);
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).conflicts).toEqual([]);
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
    const result = await flushQueue(DEVICE, 'org-a', clientWithPush(push));
    expect(result).toMatchObject({ dropped: 2, pushed: 1, conflicts: [] });
    expect(await pendingOps('org-a')).toEqual([]);
  });
});

/** Máy chủ nhận hết mọi op của lượt. */
const applyAll: Client['sync']['push'] = async (body) => ({
  results: body.ops.map((op) => ({ opId: op.opId, status: 'applied' as const })),
});
const bodyBytes = (body: unknown) => new TextEncoder().encode(JSON.stringify(body)).length;
/** Nháp ~20 dòng: mỗi lần tự lưu sinh một op mang trọn các dòng. */
const bigDraft = () => ({
  supplierName: 'Chú Bảy Hòa Bình',
  lines: Array.from({ length: 20 }, (_, i) => ({
    id: `l${i}`, productId: crypto.randomUUID(), productName: 'Mủ nước cao su', unit: 'kg',
    formulaType: 'rubberLatex', grossWeight: 100 + i, tareWeight: 2, qualityPercent: 30,
    pricePerUnit: 47_940, note: 'Cân lần hai, trừ bì can nhựa',
  })),
});

describe('lô vượt giới hạn thân của máy chủ (A1)', () => {
  it('200 op nháp to vẫn đẩy lên đủ, mỗi lô dưới SYNC_PUSH_MAX_BYTES', async () => {
    for (let i = 0; i < 200; i++) await enqueue({ ...opUpdate('draft', `d${i}`, bigDraft()), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>(applyAll);
    const result = await flushQueue(DEVICE, 'org-a', clientWithPush(push));
    expect(result).toMatchObject({ pushed: 200, conflicts: [] });
    expect(push.mock.calls.length).toBeGreaterThan(1);
    for (const [body] of push.mock.calls) expect(bodyBytes(body)).toBeLessThanOrEqual(SYNC_PUSH_MAX_BYTES);
    expect(await pendingOps('org-a')).toEqual([]);
  });

  it('máy chủ trả 413 thì tự chia đôi lô, không op nào bị đánh dấu kẹt', async () => {
    for (let i = 0; i < 40; i++) await enqueue({ ...opInsert('note', `n${i}`, { body: 'x' }), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>(async (body) => {
      if (body.ops.length > 7) throw new ApiError('PAYLOAD_TOO_LARGE', 413, 'Dữ liệu gửi lên quá lớn');
      return applyAll(body);
    });
    const result = await flushQueue(DEVICE, 'org-a', clientWithPush(push));
    expect(result).toMatchObject({ pushed: 40, conflicts: [] });
    expect(result.error).toBeUndefined();
    expect(await pendingOps('org-a')).toEqual([]);
  });

  it('một op đơn lẻ vẫn quá lớn thì mới kẹt, kèm lời báo rõ', async () => {
    await enqueue({ ...opInsert('note', 'big', { body: 'x' }), orgId: 'org-a' });
    await enqueue({ ...opInsert('note', 'after', { body: 'y' }), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(new ApiError('PAYLOAD_TOO_LARGE', 413, 'Dữ liệu gửi lên quá lớn'));
    const result = await flushQueue(DEVICE, 'org-a', clientWithPush(push));
    expect(result.conflicts).toEqual(['big']);
    const [stuck, after] = await pendingOps('org-a');
    expect(stuck?.conflict?.code).toBe('PAYLOAD_TOO_LARGE');
    expect(after?.conflict).toBeUndefined();
  });

  it('các lần tự lưu liên tiếp của một nháp gửi thành một op; nhận xong thì xoá hết', async () => {
    await enqueue({ ...opInsert('draft', 'd', { supplierName: 'A', lines: [] }), orgId: 'org-a' });
    await enqueue({ ...opUpdate('draft', 'd', { supplierName: 'An' }), orgId: 'org-a' });
    await enqueue({ ...opUpdate('draft', 'd', { note: 'cân sáng' }), orgId: 'org-a' });
    const last = await enqueue({ ...opUpdate('draft', 'd', { supplierName: 'Anh Ba' }), orgId: 'org-a' });
    await enqueue({ ...opUpdate('draft', 'other', { note: 'khác' }), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>(applyAll);
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).pushed).toBe(5);
    const sent = push.mock.calls[0]?.[0].ops ?? [];
    expect(sent.map((op) => [op.recordId, op.kind])).toEqual([['d', 'insert'], ['d', 'update'], ['other', 'update']]);
    expect(sent[1]).toMatchObject({ opId: last.opId, seq: last.seq, data: { supplierName: 'Anh Ba', note: 'cân sáng' } });
    expect(await pendingOps('org-a')).toEqual([]);
  });

  it('seq trùng do bản app cũ (hai tab): cắt lô trước chỗ trùng, không để cả lượt bị 422', async () => {
    const a = await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const b = await enqueue({ ...opInsert('note', 'b', {}), orgId: 'org-a' });
    const db = await openLocalDb();
    await db.put('queue', { ...b, seq: a.seq });
    const push = vi.fn<Client['sync']['push']>(applyAll);
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).pushed).toBe(2);
    expect(push.mock.calls.map(([body]) => body.ops.length)).toEqual([1, 1]);
  });
});

describe('lỗi ẩn của vòng đẩy nhiều lô', () => {
  it('cả lượt hỏng vì mạng không làm mất banner của op đã kẹt từ trước', async () => {
    await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const stuck = await enqueue({ ...opInsert('note', 'stuck', {}), orgId: 'org-a' });
    await markConflict(stuck.id, 'org-a', { code: 'VALIDATION_FAILED', message: 'Sai' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(new TypeError('fetch failed'));
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).conflicts).toEqual(['stuck']);
  });

  it('413 do proxy trả (không có thân JSON, SDK gọi là INTERNAL) vẫn chia lô', async () => {
    for (let i = 0; i < 6; i++) await enqueue({ ...opInsert('note', `n${i}`, { body: 'x' }), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>(async (body) => {
      if (body.ops.length > 2) throw new ApiError('INTERNAL', 413, 'HTTP 413');
      return applyAll(body);
    });
    expect(await flushQueue(DEVICE, 'org-a', clientWithPush(push))).toMatchObject({ pushed: 6, conflicts: [] });
    expect((await pendingOps('org-a'))).toEqual([]);
  });

  it('op ghi thêm trong lúc đang gửi được gửi luôn trong lượt', async () => {
    await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    let typed = false;
    const push = vi.fn<Client['sync']['push']>(async (body) => {
      if (!typed) {
        typed = true;
        await enqueue({ ...opInsert('note', 'b', {}), orgId: 'org-a' });
      }
      return applyAll(body);
    });
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).pushed).toBe(2);
    expect(await pendingOps('org-a')).toEqual([]);
  });

  it('hai tab cùng đẩy: mỗi op lên đúng một lần, không có bản gộp nháp cũ đè bản mới', async () => {
    await enqueue({ ...opUpdate('draft', 'd', { note: '1' }), orgId: 'org-a' });
    await enqueue({ ...opUpdate('draft', 'd', { note: '2' }), orgId: 'org-a' });
    const sent: string[] = [];
    const push = vi.fn<Client['sync']['push']>(async (body) => {
      sent.push(...body.ops.map((op) => op.opId));
      await new Promise((r) => setTimeout(r, 5));
      return applyAll(body);
    });
    const [a, b] = await Promise.all([
      flushQueue(DEVICE, 'org-a', clientWithPush(push)),
      flushQueue(DEVICE, 'org-a', clientWithPush(push)),
    ]);
    expect(a.pushed + b.pushed).toBe(2);
    expect(sent).toHaveLength(1);
  });

  it('trình duyệt không có Web Locks: vẫn gửi đủ, chỉ không gộp nháp', async () => {
    vi.stubGlobal('navigator', {});
    await enqueue({ ...opUpdate('draft', 'd', { note: '1' }), orgId: 'org-a' });
    await enqueue({ ...opUpdate('draft', 'd', { note: '2' }), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>(applyAll);
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).pushed).toBe(2);
    expect(push.mock.calls[0]?.[0].ops).toHaveLength(2);
  });
});

describe('cảnh báo trong kết quả đẩy (B2)', () => {
  it('lần trả tiền vào phiếu đã bị xoá: báo kèm phiếu cha và số tiền', async () => {
    const op = await enqueue({ ...opInsert('payment', 'pay-1', { transactionId: 'tx-1', amount: 500_000 }), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({
      results: [{ opId: op.opId, status: 'applied', warning: 'RECORD_DELETED' }],
    });
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).warnings).toEqual([{
      code: 'RECORD_DELETED', entity: 'payment', kind: 'insert', recordId: 'pay-1', transactionId: 'tx-1', amount: 500_000,
    }]);
  });

  it('ORDER_NOT_OPEN được báo lên, op vẫn xoá khỏi hàng đợi như thường', async () => {
    const op = await enqueue({ ...opInsert('transaction', 'tx-1', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({
      results: [{ opId: op.opId, status: 'applied', warning: 'ORDER_NOT_OPEN' }],
    });
    const result = await flushQueue(DEVICE, 'org-a', clientWithPush(push));
    expect(result.warnings).toEqual([{ code: 'ORDER_NOT_OPEN', entity: 'transaction', kind: 'insert', recordId: 'tx-1' }]);
    expect(await pendingOps('org-a')).toEqual([]);
  });
});

describe('đếm riêng lần bị máy chủ từ chối (B9)', () => {
  it('rớt mạng nhiều lần rồi gặp một lần INTERNAL thì chưa kẹt', async () => {
    const op = await enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockRejectedValue(new TypeError('fetch failed'));
    for (let i = 0; i < MAX_REJECTED_TRIES - 1; i++) {
      await flushQueue(DEVICE, 'org-a', clientWithPush(push));
      await dueAgainKeepingTries();
    }
    expect((await pendingOps('org-a'))[0]?.tries).toBe(MAX_REJECTED_TRIES - 1);

    push.mockResolvedValue({ results: [{ opId: op.opId, status: 'rejected', error: { code: 'INTERNAL', message: 'Lỗi' } }] });
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).conflicts).toEqual([]);
    expect((await pendingOps('org-a'))[0]?.conflict).toBeUndefined();
  });
});

describe('op mặt hàng mẫu kiểu cũ', () => {
  it('bản app cũ lỡ xếp vào hàng đợi thì tự gỡ, không gửi, không chặn op sau', async () => {
    await enqueue({ ...opUpdate('product', 'prod-rubber', { lastPricePerUnit: 1 }), orgId: 'org-a' });
    const note = await enqueue({ ...opInsert('note', 'n', {}), orgId: 'org-a' });
    const push = vi.fn<Client['sync']['push']>().mockResolvedValue({ results: [{ opId: note.opId, status: 'applied' }] });
    expect((await flushQueue(DEVICE, 'org-a', clientWithPush(push))).pushed).toBe(1);
    expect(push.mock.calls[0]?.[0].ops.map((op) => op.recordId)).toEqual(['n']);
    expect(await pendingOps('org-a')).toEqual([]);
  });
});

/** Đưa mọi thao tác về hạn gửi, như máy chủ đã từ chối `tries` lần. */
const dueAgain = async (tries: number): Promise<void> => {
  const db = await openLocalDb();
  for (const op of await pendingOps('org-a')) {
    await db.put('queue', { ...op, tries, rejectedTries: tries, nextAttemptAt: new Date(0).toISOString() } satisfies QueuedOp);
  }
};

/** Đưa mọi thao tác về hạn gửi, giữ nguyên các bộ đếm. */
const dueAgainKeepingTries = async (): Promise<void> => {
  const db = await openLocalDb();
  for (const op of await pendingOps('org-a')) await db.put('queue', { ...op, nextAttemptAt: new Date(0).toISOString() });
};
