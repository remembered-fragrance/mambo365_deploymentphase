/** Bản `/v1/me` nhớ trong máy: mở app vào sổ ngay, không chờ API thức dậy. */

import { beforeEach, expect, it, vi } from 'vitest';
import type { Me } from '@mambo/contracts';
import { forgetMe, recallMe, rememberMe } from '@/data/meCache';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';

const me = (): Me => ({
  user: { id: USER, name: 'Hùng', phone: '+84912345678', email: null, phoneVerified: false },
  memberships: [
    {
      organization: { id: ORG, name: 'Vựa Hùng', type: 'trader' },
      role: 'owner',
      branch: null,
      permissions: ['book:sync'],
      features: [],
      plan: null,
    },
  ],
  pendingLinks: 0,
});

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

it('nhớ rồi đọc lại đúng bản của đúng người', () => {
  rememberMe(me());
  const recalled = recallMe(USER);
  expect(recalled?.memberships[0]?.organization.id).toBe(ORG);
  expect(recallMe('33333333-3333-4333-8333-333333333333')).toBeNull();
});

it('đăng xuất: quên sạch', () => {
  rememberMe(me());
  forgetMe(USER);
  expect(recallMe(USER)).toBeNull();
});

it('bản hỏng hoặc sai hình dạng hợp đồng (app bản cũ ghi) ⇒ coi như chưa có', () => {
  localStorage.setItem(`thumua365:me:${USER}`, '{không phải json');
  expect(recallMe(USER)).toBeNull();
  localStorage.setItem(`thumua365:me:${USER}`, JSON.stringify({ user: { id: USER } }));
  expect(recallMe(USER)).toBeNull();
});

it('trình duyệt chặn bộ nhớ: không vỡ app', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  });
  expect(() => rememberMe(me())).not.toThrow();
  expect(recallMe(USER)).toBeNull();
  expect(() => forgetMe(USER)).not.toThrow();
});
