/**
 * App dùng `AuthClient` trần thay cho `createClient` của supabase-js (bớt ~110KB JS khởi tạo).
 * Phiên đang lưu trong máy người dùng phải đọc được y như cũ — không thì cập nhật app là đăng
 * xuất tất cả mọi người: cùng khoá lưu phiên, cùng địa chỉ Auth, cùng header khoá công khai.
 */

import { createClient } from '@supabase/supabase-js';
import { afterEach, expect, it, vi } from 'vitest';

interface Internals {
  readonly storageKey: string;
  readonly url: string;
  readonly headers: Record<string, string>;
}

const KEY = 'sb_publishable_test';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it.each(['https://abcdefgh.supabase.co', 'https://abcdefgh.supabase.co/'])(
  'khớp cấu hình Auth của createClient (%s)',
  async (url) => {
    vi.stubEnv('VITE_SUPABASE_URL', url);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', KEY);
    const { getSupabase } = await import('@/data/client');
    const ours = getSupabase()?.auth as unknown as Internals;
    const theirs = createClient(url, KEY, {
      auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    }).auth as unknown as Internals;

    expect(ours.storageKey).toBe(theirs.storageKey);
    expect(ours.storageKey).toBe('sb-abcdefgh-auth-token');
    expect(ours.url).toBe(theirs.url);
    expect(ours.headers).toMatchObject({ Authorization: theirs.headers.Authorization, apikey: theirs.headers.apikey });
  },
);
