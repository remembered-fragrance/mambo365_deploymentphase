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

const { captureUtm, flushEvents, track, utmProps } = await import('@/data/track');
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

describe('UTM — nguồn khách tới (BE 0.26.0)', () => {
  beforeEach(() => {
    store.clear();
    client.backend = true;
  });

  it('link có utm_source: giữ lại (chữ thường) và gửi kèm app_opened đúng hợp đồng', () => {
    captureUtm('?utm_source=Facebook&utm_medium=nhom&utm_campaign=oc2&utm_content=tin-a&fbclid=abc');
    expect(utmProps()).toEqual({ utm: { source: 'facebook', medium: 'nhom', campaign: 'oc2', content: 'tin-a' } });
    track('app_opened', utmProps());
    expect(EventsTrackRequest.safeParse({ events: queued() }).success).toBe(true);
  });

  it('link không có UTM giữ nguồn cũ; link UTM mới thì thay', () => {
    captureUtm('?utm_source=zalo');
    captureUtm('?ma=ABC123');
    expect(utmProps()).toEqual({ utm: { source: 'zalo' } });
    captureUtm('?utm_source=truc-tiep&utm_medium=qr&utm_campaign=oc2');
    expect(utmProps()).toEqual({ utm: { source: 'truc-tiep', medium: 'qr', campaign: 'oc2' } });
  });

  it('🔴 giá trị lạ (chữ tự do, thiếu source) không được lưu — không làm server bỏ sự kiện', () => {
    captureUtm('?utm_source=C%C3%B4%20Mai%200912345678');
    captureUtm('?utm_medium=social');
    expect(utmProps()).toEqual({});
  });
});
