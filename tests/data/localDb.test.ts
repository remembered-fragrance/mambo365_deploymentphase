/**
 * Mã máy và số thứ tự của hàng đợi — hai thứ máy chủ kiểm ở vỏ của cả lượt đẩy. Sai một trong hai thì
 * MỌI lượt đẩy bị 422, hàng đợi đứng yên mà người dùng không gỡ được.
 */

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { getDeviceId } from '@/data/localDb';
import { clearQueue, enqueue, opInsert, pendingOps } from '@/data/queue';

/** Bắt sẵn trước khi giả lập trình duyệt cũ (thay cả `crypto`). */
const getRandomValues = crypto.getRandomValues.bind(crypto);
const isUuid = (value: string) => z.uuid().safeParse(value).success;

const memoryStorage = (): Storage => {
  const items = new Map<string, string>();
  return {
    get length() { return items.size; },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (key) => { items.delete(key); },
    setItem: (key, value) => { items.set(key, String(value)); },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('getDeviceId — máy chủ bắt deviceId là UUID', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('trình duyệt cũ không có crypto.randomUUID vẫn ra UUID', () => {
    // Chrome Android < 92, iOS Safari < 15.4: chỉ có getRandomValues.
    vi.stubGlobal('crypto', { getRandomValues });
    const id = getDeviceId();
    expect(isUuid(id)).toBe(true);
    expect(getDeviceId()).toBe(id);
  });

  it('id cũ dạng `dev-…` đã lưu thì sinh lại và ghi đè', () => {
    localStorage.setItem('thumua365_device_id', 'dev-k3j2h1');
    const id = getDeviceId();
    expect(isUuid(id)).toBe(true);
    expect(localStorage.getItem('thumua365_device_id')).toBe(id);
  });

  it('id UUID đã lưu thì giữ nguyên', () => {
    const saved = crypto.randomUUID();
    localStorage.setItem('thumua365_device_id', saved);
    expect(getDeviceId()).toBe(saved);
  });
});

describe('seq của hàng đợi không phụ thuộc giờ máy', () => {
  beforeEach(clearQueue);

  it('đồng hồ lùi giữa hai lần mở app: op mới vẫn đứng sau op cũ', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T10:00:00Z'));
    await enqueue({ ...opInsert('transaction', 'tx-1', {}), orgId: 'org-a' });

    // Mở lại app (mốc trong bộ nhớ mất) sau khi đồng hồ máy bị chỉnh lùi một giờ.
    vi.resetModules();
    const reopened = await import('@/data/queue');
    vi.setSystemTime(new Date('2026-10-19T09:00:00Z'));
    await reopened.enqueue({ ...opInsert('payment', 'pay-1', { transactionId: 'tx-1' }), orgId: 'org-a' });

    expect((await pendingOps('org-a')).map((op) => op.recordId)).toEqual(['tx-1', 'pay-1']);
  });

  it('hai tab ghi cùng lúc không cấp trùng seq', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T10:00:00Z'));
    vi.resetModules();
    const tabA = await import('@/data/queue');
    vi.resetModules();
    const tabB = await import('@/data/queue');

    await Promise.all([
      tabA.enqueue({ ...opInsert('note', 'a', {}), orgId: 'org-a' }),
      tabB.enqueue({ ...opInsert('note', 'b', {}), orgId: 'org-a' }),
      tabA.enqueue({ ...opInsert('note', 'c', {}), orgId: 'org-a' }),
    ]);

    const seqs = (await pendingOps('org-a')).map((op) => op.seq);
    expect(new Set(seqs).size).toBe(3);
  });
});
