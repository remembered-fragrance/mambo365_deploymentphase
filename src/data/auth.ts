/**
 * Đăng ký / đăng nhập / bootstrap tổ chức.
 *
 * Quy tắc đăng nhập:
 * - Email: đăng nhập thẳng qua Supabase Auth.
 * - Số điện thoại: thử đúng email nội bộ đã dùng khi đăng ký; nếu tài khoản
 *   dùng email thật thì mới fallback qua API resolveIdentifier.
 * - Tên tài khoản: resolve qua API rồi mới đăng nhập Supabase.
 *
 * 🔴 Lỗi đăng nhập luôn dùng cùng một câu:
 * "Tài khoản hoặc mật khẩu không đúng".
 *
 * Không gọi trực tiếp bảng `profiles` qua PostgREST.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Me, MeBootstrapInput, MeMembership } from '@mambo/contracts';
import { detectIdentifierKind, normalizePhone } from '@/core/identifier';
import type { UserProfile } from '@/core/types';
import { api, setCurrentOrg } from './client';
import type { ProfileRow } from './rows';

/** Tên miền nội bộ dùng cho tài khoản chỉ có số điện thoại. */
const INTERNAL_EMAIL_DOMAIN = 'id.thumua365.vn';

export const SIGN_IN_ERROR = 'Tài khoản hoặc mật khẩu không đúng';

export interface SignUpInput {
  readonly name: string;
  readonly phone: string;
  readonly password: string;
  readonly username?: string;
  readonly email?: string;
  readonly businessName?: string;
  readonly referralCode?: string;
}

const internalEmail = (phoneE164: string): string =>
  `${phoneE164.replace('+', '')}@${INTERNAL_EMAIL_DOMAIN}`;

export const profileFromRow = (row: ProfileRow, loginEmail: string): UserProfile => ({
  id: row.id,
  identifier: row.phone ?? row.username ?? loginEmail,
  name: row.name,
  username: row.username ?? undefined,
  email: row.recovery_email ?? undefined,
  phone: row.phone ?? undefined,
  businessName: row.business_name ?? undefined,
  referralCode: row.referral_code ?? undefined,
});

export const profileFromMe = (me: Me, defaultEmail?: string): UserProfile => ({
  id: me.user.id,
  identifier: me.user.phone ?? me.user.email ?? defaultEmail ?? '',
  name: me.user.name ?? '',
  email: me.user.email ?? undefined,
  phone: me.user.phone ?? undefined,
});

export const profileForSelectedMembership = (
  profile: UserProfile,
  membership: Pick<MeMembership, 'organization'> | null,
): UserProfile => ({
  ...profile,
  businessName: membership?.organization.name,
});

export const profileFromAuthUser = (user: User): UserProfile => ({
  id: user.id,
  identifier:
    (user.user_metadata?.phone as string | undefined) ?? user.phone ?? user.email ?? '',
  name: (user.user_metadata?.name as string | undefined) ?? '',
  email: user.email ?? undefined,
  phone: (user.user_metadata?.phone as string | undefined) ?? user.phone ?? undefined,
});

const signInWithEmail = async (
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<User | null> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) return null;
  return data.user;
};

export const signIn = async (
  supabase: SupabaseClient,
  identifier: string,
  password: string,
): Promise<User> => {
  const rawIdentifier = identifier.trim();

  if (!rawIdentifier || !password) {
    throw new Error(SIGN_IN_ERROR);
  }

  const kind = detectIdentifierKind(rawIdentifier);

  // 1. Số điện thoại:
  //    thử trực tiếp email nội bộ được tạo bởi signUp().
  if (kind === 'phone') {
    const phone = normalizePhone(rawIdentifier);
    if (!phone) throw new Error(SIGN_IN_ERROR);

    const generatedEmail = internalEmail(phone);

    const directUser = await signInWithEmail(
      supabase,
      generatedEmail,
      password,
    );

    if (directUser) return directUser;

    /*
     * Fallback cho tài khoản cũ (nếu lúc đăng ký từng dùng email thật thay vì email nội bộ):
     * Nhờ backend tra cứu định danh.
     */
    try {
      const resolved = await api.resolveIdentifier({
        identifier: rawIdentifier,
      });

      const resolvedEmail = resolved?.email?.trim().toLowerCase();

      if (resolvedEmail && resolvedEmail !== generatedEmail.toLowerCase()) {
        const resolvedUser = await signInWithEmail(
          supabase,
          resolvedEmail,
          password,
        );

        if (resolvedUser) return resolvedUser;
      }
    } catch {
      // Giữ lỗi chung phía dưới.
    }

    throw new Error(SIGN_IN_ERROR);
  }

  // 2. Email:
  //    Email thật đóng vai trò recovery_email, khoá Supabase Auth là email nội bộ SĐT.
  //    Resolve qua backend trước để lấy login email; nếu backend chưa kết nối thì fallback thử đăng nhập trực tiếp.
  if (kind === 'email') {
    try {
      const resolved = await api.resolveIdentifier({
        identifier: rawIdentifier,
      });

      const loginEmail = resolved?.email?.trim().toLowerCase();
      if (loginEmail) {
        const resolvedUser = await signInWithEmail(
          supabase,
          loginEmail,
          password,
        );

        if (resolvedUser) return resolvedUser;
      }
    } catch {
      // Tiếp tục fallback đăng nhập trực tiếp
    }

    // Fallback: hỗ trợ trường hợp tài khoản tạo trực tiếp bằng email thật trên Supabase Auth
    const directUser = await signInWithEmail(
      supabase,
      rawIdentifier.toLowerCase(),
      password,
    );

    if (directUser) return directUser;

    throw new Error(SIGN_IN_ERROR);
  }

  // 3. Tên tài khoản: backend là nơi duy nhất biết username thuộc email nào.
  try {
    const resolved = await api.resolveIdentifier({
      identifier: rawIdentifier,
    });

    const loginEmail = resolved?.email?.trim().toLowerCase();
    if (!loginEmail) throw new Error(SIGN_IN_ERROR);

    const user = await signInWithEmail(
      supabase,
      loginEmail,
      password,
    );

    if (!user) throw new Error(SIGN_IN_ERROR);
    return user;
  } catch {
    throw new Error(SIGN_IN_ERROR);
  }
};

export const signUp = async (
  supabase: SupabaseClient,
  input: SignUpInput,
): Promise<User> => {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error('Số điện thoại chưa đúng');

  const recoveryEmail =
    input.email && detectIdentifierKind(input.email.trim()) === 'email'
      ? input.email.trim().toLowerCase()
      : undefined;

  /*
   * Theo thiết kế hệ thống và Backend:
   * SĐT là định danh số 1. Tài khoản Supabase Auth LUÔN LUÔN dùng email nội bộ
   * sinh từ SĐT: 849xxx@id.thumua365.vn làm khoá xác thực duy nhất.
   * Email thật (nếu người dùng nhập) sẽ lưu vào recoveryEmail để dùng khôi phục và resolve khi cần.
   */
  const loginEmail = internalEmail(phone);

  const { data, error } = await supabase.auth.signUp({
    email: loginEmail,
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        phone,
        ...(input.username?.trim()
          ? { username: input.username.trim().toLowerCase() }
          : {}),
        ...(recoveryEmail ? { recoveryEmail } : {}),
      },
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Không tạo được tài khoản');
  }

  return data.user;
};

export const bootstrap = async (input: MeBootstrapInput): Promise<Me> => {
  return api.meBootstrap(input);
};

export const getMe = async (): Promise<Me> => {
  return api.me();
};

export const signOut = async (supabase: SupabaseClient): Promise<void> => {
  await supabase.auth.signOut();
  setCurrentOrg(null);
};

export interface ProfilePatch {
  readonly name?: string;
  readonly username?: string;
  readonly email?: string;
}

export type AccountProfile = Awaited<ReturnType<typeof api.account.profile>>;

export const getAccountProfile = async (): Promise<AccountProfile> => api.account.profile();

export const claimReferral = async (code: string): Promise<boolean> => {
  const result = await api.account.claimReferral({ code: code.trim() });
  return result.claimed;
};

export const updateProfile = async (
  _supabase: SupabaseClient,
  _userId: string,
  patch: ProfilePatch,
): Promise<AccountProfile> => {
  const update = {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.username !== undefined ? { username: patch.username.trim() || null } : {}),
    ...(patch.email !== undefined ? { recoveryEmail: patch.email.trim() || null } : {}),
  };
  if (Object.keys(update).length === 0) return api.account.profile();
  return api.account.updateProfile(update);
};

export const changePassword = async (
  supabase: SupabaseClient,
  password: string,
): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(`Không đổi được mật khẩu: ${error.message}`);
  }
};
