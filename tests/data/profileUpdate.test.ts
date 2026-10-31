/** Sửa hồ sơ đi qua PATCH /v1/me/profile, rồi chép tên + email khôi phục sang user_metadata. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseAuth } from '@/data/client';

const fetchMock = vi.hoisted(() => vi.fn());

// SDK thật trên fetch giả: kiểm đúng đường, token và cách SDK đọc lỗi `{ error }`.
vi.mock('@/data/client', async () => {
  const { createClient } = await import('@mambo/sdk');
  return {
    api: createClient({ baseUrl: 'http://api.test', getAccessToken: () => 'tok', getOrganizationId: () => null, fetch: (...args) => fetchMock(...args) }),
    setCurrentOrg: vi.fn(),
  };
});

const { updateProfile } = await import('@/data/auth');

const saved = {
  name: 'Hùng',
  username: 'vuahung',
  phone: '+84912345678',
  recoveryEmail: 'hung@gmail.com',
  recoveryEmailVerified: false,
  referralCode: null,
  referred: false,
};

const updateUser = vi.fn(async () => ({ data: {}, error: null }));
const supabase = { auth: { updateUser } } as unknown as SupabaseAuth;

beforeEach(() => {
  fetchMock.mockReset();
  updateUser.mockClear();
});

describe('updateProfile', () => {
  it('PATCH đúng trường (email → recoveryEmail, rỗng → null), có token, rồi đồng bộ user_metadata', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(saved), { status: 200 }));

    const result = await updateProfile(supabase, 'u1', { name: ' Hùng ', username: 'VuaHung', email: ' Hung@Gmail.com ' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/v1/me/profile');
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Hùng', username: 'vuahung', recoveryEmail: 'hung@gmail.com' });
    expect(updateUser).toHaveBeenCalledWith({ data: { name: 'Hùng', recoveryEmail: 'hung@gmail.com' } });
    expect(result).toEqual(saved);
  });

  it('xoá email: gửi recoveryEmail null', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...saved, recoveryEmail: null }), { status: 200 }));
    await updateProfile(supabase, 'u1', { email: '' });
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual({ recoveryEmail: null });
  });

  it('email đã thuộc tài khoản khác → ném lỗi mang details.fields, KHÔNG đụng user_metadata', async () => {
    const body = {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Email này đang là email khôi phục của tài khoản khác',
        details: { fields: { recoveryEmail: 'Đã có tài khoản dùng email này' } },
      },
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 422 }));

    await expect(updateProfile(supabase, 'u1', { email: 'x@gmail.com' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { fields: { recoveryEmail: 'Đã có tài khoản dùng email này' } },
    });
    expect(updateUser).not.toHaveBeenCalled();
  });
});
