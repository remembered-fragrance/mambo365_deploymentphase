/**
 * Issue #9: đăng ký có cả SĐT và email từng tạo ra hai tài khoản. Khoá đăng nhập
 * Supabase giờ LUÔN là email nội bộ sinh từ SĐT; email thật chỉ là email khôi phục.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const resolveIdentifier = vi.fn();
vi.mock('@/data/client', () => ({
  api: { resolveIdentifier: (input: unknown) => resolveIdentifier(input) },
  setCurrentOrg: vi.fn(),
}));

const { signIn, signUp, SIGN_IN_ERROR } = await import('@/data/auth');

const INTERNAL = '84912345678@id.thumua365.vn';

/** Supabase giả: mỗi email đăng nhập được với đúng một mật khẩu. */
const fakeSupabase = (accounts: Record<string, string>) => {
  const signInWithPassword = vi.fn(async ({ email, password }: { email: string; password: string }) =>
    accounts[email] === password
      ? { data: { user: { id: email } }, error: null }
      : { data: { user: null }, error: { message: 'Invalid login credentials' } },
  );
  const signUpFn = vi.fn(async ({ email }: { email: string }) =>
    accounts[email]
      ? { data: { user: { id: 'fake', identities: [] } }, error: null }
      : { data: { user: { id: email, identities: [{}] } }, error: null },
  );
  const client = { auth: { signInWithPassword, signUp: signUpFn } } as unknown as SupabaseClient;
  return { client, signInWithPassword, signUp: signUpFn };
};

beforeEach(() => resolveIdentifier.mockReset());

describe('signUp', () => {
  it('có cả SĐT và email → khoá vẫn là email nội bộ, email thật vào user_metadata.recoveryEmail', async () => {
    const supa = fakeSupabase({});
    await signUp(supa.client, { name: 'Hùng', phone: '0912 345 678', email: 'Hung@Gmail.com', password: 'secret12' });
    expect(supa.signUp).toHaveBeenCalledWith({
      email: INTERNAL,
      password: 'secret12',
      options: { data: { name: 'Hùng', phone: '+84912345678', recoveryEmail: 'hung@gmail.com' } },
    });
  });

  it('SĐT đã có tài khoản (Supabase trả user không có identities) → báo trùng số, không tạo tài khoản thứ hai', async () => {
    const supa = fakeSupabase({ [INTERNAL]: 'old' });
    await expect(
      signUp(supa.client, { name: 'Hùng', phone: '0912345678', email: 'hung@gmail.com', password: 'secret12' }),
    ).rejects.toThrow(/đã có tài khoản/);
  });
});

describe('signIn', () => {
  it('SĐT và email khôi phục cùng ra MỘT tài khoản', async () => {
    const supa = fakeSupabase({ [INTERNAL]: 'pw' });
    resolveIdentifier.mockResolvedValue({ email: INTERNAL });

    const byPhone = await signIn(supa.client, '0912345678', 'pw');
    const byEmail = await signIn(supa.client, 'hung@gmail.com', 'pw');

    expect(byPhone.id).toBe(INTERNAL);
    expect(byEmail.id).toBe(INTERNAL);
    expect(resolveIdentifier).toHaveBeenCalledWith({ identifier: 'hung@gmail.com' });
  });

  it('tài khoản cũ đăng ký bằng email thật vẫn đăng nhập thẳng bằng email', async () => {
    const supa = fakeSupabase({ 'hung@gmail.com': 'pw' });
    const user = await signIn(supa.client, 'Hung@Gmail.com', 'pw');
    expect(user.id).toBe('hung@gmail.com');
    expect(resolveIdentifier).not.toHaveBeenCalled();
  });

  it('sai mật khẩu → một câu chung, backend trả lại đúng email vừa thử thì không thử lần nữa', async () => {
    const supa = fakeSupabase({ [INTERNAL]: 'pw' });
    resolveIdentifier.mockResolvedValue({ email: INTERNAL });
    await expect(signIn(supa.client, '0912345678', 'sai')).rejects.toThrow(SIGN_IN_ERROR);
    expect(supa.signInWithPassword).toHaveBeenCalledTimes(1);
  });
});

describe('profileFromMe', () => {
  it('API cũ trả phone/email null → lấy SĐT từ email nội bộ, email từ user_metadata.recoveryEmail', async () => {
    const { profileFromMe } = await import('@/data/auth');
    const me = { user: { id: 'u1', name: 'Hùng', phone: null, email: null }, memberships: [] };
    const account = { email: INTERNAL, user_metadata: { recoveryEmail: 'hung@gmail.com' } };
    const profile = profileFromMe(me as never, account as never);
    expect(profile.phone).toBe('+84912345678');
    expect(profile.email).toBe('hung@gmail.com');
    expect(profile.identifier).toBe('+84912345678');
  });
});
