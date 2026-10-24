import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsTrackRequest } from '@mambo/contracts';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const client = vi.hoisted(() => ({ backend: true, send: vi.fn() }));
vi.mock('@/data/client', () => ({
  hasBackend: () => client.backend,
  api: { events: { track: client.send } },
}));

const { flushEvents, track } = await import('@/data/track');
const queued = () => JSON.parse(store.get('thumua365:events') ?? '[]') as unknown[];

describe('đo lường — hàng đợi sự kiện', () => {
  beforeEach(() => {
    store.clear();
    client.backend = true;
    client.send.mockReset().mockResolvedValue({ accepted: 0, dropped: 0 });
  });

  it('sự kiện ghi ra đúng hình dạng hợp đồng (server không bỏ)', () => {
    track('receipt_created', { kind: 'purchase', lines: 2, offline: true, fromOrder: false });
    track('app_opened', {});
    expect(EventsTrackRequest.safeParse({ events: queued() }).success).toBe(true);
  });

  it('gửi theo lô ≤ 50 rồi xoá khỏi hàng đợi', async () => {
    for (let i = 0; i < 120; i++) track('app_opened', {});
    await flushEvents();
    expect(client.send.mock.calls.map(([body]) => body.events.length)).toEqual([50, 50, 20]);
    expect(queued()).toEqual([]);
  });

  it('mất mạng: giữ nguyên phần chưa gửi để lần sau thử lại', async () => {
    client.send.mockRejectedValue(new TypeError('Failed to fetch'));
    track('app_opened', {});
    await flushEvents();
    expect(queued()).toHaveLength(1);
  });

  it('không bao giờ quá 500 sự kiện trong máy', () => {
    for (let i = 0; i < 600; i++) track('app_opened', {});
    expect(queued()).toHaveLength(500);
  });

  it('sổ của máy này (không có máy chủ): không ghi gì', () => {
    client.backend = false;
    track('app_opened', {});
    expect(queued()).toEqual([]);
  });
});
