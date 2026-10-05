/**
 * Đăng ký / đăng nhập / bootstrap tổ chức.
 *
 * Người dùng gõ MỘT ô: tên tài khoản, số điện thoại hoặc email.
 * Gọi API `api.resolveIdentifier` dịch ra email nội bộ rồi mới đăng nhập qua Supabase Auth.
 *
 * 🔴 Lỗi LUÔN cùng một câu: "Tài khoản hoặc mật khẩu không đúng".
 * Không bao giờ gọi trực tiếp bảng `profiles` qua PostgREST (đã bị tắt).
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Me, MeBootstrapInput } from '@mambo/contracts';
import { detectIdentifierKind, normalizePhone } from '@/core/identifier';
import type { UserProfile } from '@/core/types';
import { FeatureUnavailableError } from './capabilities';
import { api, setCurrentOrg } from './client';
import type { ProfileRow } from './rows';

/** Tên miền ta sở hữu, không gửi thư tới. Dùng cho người chỉ có số điện thoại. */
const INTERNAL_EMAIL_DOMAIN = 'id.thumua365.vn';

export const SIGN_IN_ERROR = 'Tài khoản hoặc mật khẩu không đúng';

export interface SignUpInput {
  readonly name: string;
  readonly phone: string;
  readonly password: string;
  readonly username?: string;
  readonly email?: string;
  readonly businessName?: string;
  /** Mã của người đã mời. Sai mã thì bỏ qua, không chặn việc đăng ký. */
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
  businessName: me.memberships[0]?.organization.name ?? undefined,
});

export const signIn = async (
  supabase: SupabaseClient,
  identifier: string,
  password: string,
): Promise<User> => {
  let loginEmail = identifier.trim();

  // Dùng API resolveIdentifier để tra email đăng nhập từ username/SĐT/email
  try {
    const res = await api.resolveIdentifier({ identifier: loginEmail });
    if (res?.email) {
      loginEmail = res.email;
    }
  } catch {
    // Không tra được cũng báo y hệt sai mật khẩu
    throw new Error(SIGN_IN_ERROR);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (error || !data.user) throw new Error(SIGN_IN_ERROR);
  return data.user;
};

export const signUp = async (supabase: SupabaseClient, input: SignUpInput): Promise<User> => {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error('Số điện thoại chưa đúng');

  const recoveryEmail =
    input.email && detectIdentifierKind(input.email) === 'email'
      ? input.email.trim().toLowerCase()
      : undefined;

  // Có email thật thì dùng chính nó để đăng nhập; không thì dùng email nội bộ.
  if (input.referralCode?.trim()) throw new FeatureUnavailableError('Referral');
  const loginEmail = recoveryEmail ?? internalEmail(phone);

  const { data, error } = await supabase.auth.signUp({
    email: loginEmail,
    password: input.password,
  });

  if (error || !data.user) throw new Error(error?.message ?? 'Không tạo được tài khoản');
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
  readonly businessName?: string;
  readonly email?: string;
}

/**
 * Sửa hồ sơ vựa.
 * Backend chưa mở endpoint PATCH /v1/me/profile (dự kiến BE6).
 * Frontend tạm lưu trên máy, không gọi bảng profiles qua PostgREST.
 */
export const updateProfile = async (
  _supabase: SupabaseClient,
  _userId: string,
  _patch: ProfilePatch,
): Promise<void> => {
  throw new FeatureUnavailableError('Profile update');
};

export const changePassword = async (
  supabase: SupabaseClient,
  password: string,
): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(`Không đổi được mật khẩu: ${error.message}`);
};

export const loadProfile = async (
  _supabase: SupabaseClient,
  user: User,
): Promise<UserProfile | null> => {
  try {
    const me = await api.me();
    return profileFromMe(me, user.email ?? '');
  } catch {
    // Nếu offline hoặc API chưa phản hồi, trả profile cơ bản từ Supabase session
    return {
      id: user.id,
      identifier: user.phone ?? user.email ?? '',
      name: user.user_metadata?.name ?? '',
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
    };
  }
};
