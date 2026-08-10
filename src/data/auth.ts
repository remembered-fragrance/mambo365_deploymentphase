/**
 * Đăng ký / đăng nhập.
 *
 * Người dùng gõ MỘT ô: tên tài khoản, số điện thoại hoặc email. Hàm RPC
 * `resolve_identifier` phía database dịch ra email nội bộ rồi mới đăng nhập.
 *
 * 🔴 Lỗi LUÔN cùng một câu, dù sai tài khoản hay sai mật khẩu. Phân biệt hai
 * trường hợp là biến màn đăng nhập thành công cụ dò xem ai có tài khoản.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { detectIdentifierKind, normalizePhone } from '@/core/identifier';
import type { UserProfile } from '@/core/types';
import { claimReferral } from './billing';
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

export const signIn = async (
  supabase: SupabaseClient,
  identifier: string,
  password: string,
): Promise<User> => {
  const { data: email, error: rpcError } = await supabase.rpc('resolve_identifier', {
    raw: identifier,
  });
  // Không tra được cũng báo y hệt sai mật khẩu.
  if (rpcError || !email) throw new Error(SIGN_IN_ERROR);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email),
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
  const loginEmail = recoveryEmail ?? internalEmail(phone);

  const { data, error } = await supabase.auth.signUp({ email: loginEmail, password: input.password });
  if (error || !data.user) throw new Error(error?.message ?? 'Không tạo được tài khoản');

  const profile = {
    id: data.user.id,
    name: input.name.trim(),
    username: input.username?.trim().toLowerCase() || null,
    phone,
    recovery_email: recoveryEmail ?? null,
    business_name: input.businessName?.trim() || null,
  };
  const { error: profileError } = await supabase.from('profiles').insert(profile);
  if (profileError) throw new Error(`Không lưu được hồ sơ: ${profileError.message}`);

  // Ghi nhận lời mời SAU khi hồ sơ đã có. Mã sai không được làm hỏng việc đăng
  // ký: người dùng gõ nhầm mã của bạn mình thì vẫn phải vào được app.
  if (input.referralCode) await claimReferral(supabase, input.referralCode);

  return data.user;
};

export const signOut = async (supabase: SupabaseClient): Promise<void> => {
  await supabase.auth.signOut();
};

export interface ProfilePatch {
  readonly name?: string;
  readonly businessName?: string;
  readonly email?: string;
}

/**
 * Sửa hồ sơ vựa. KHÔNG đụng tới số điện thoại: nó là khoá đăng nhập, đổi số
 * là việc phải xác minh chứ không phải sửa một ô trong form.
 */
export const updateProfile = async (
  supabase: SupabaseClient,
  userId: string,
  patch: ProfilePatch,
): Promise<void> => {
  const row: Record<string, string | null> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.businessName !== undefined) row.business_name = patch.businessName.trim() || null;
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    row.recovery_email = email && detectIdentifierKind(email) === 'email' ? email : null;
  }

  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) throw new Error(`Không lưu được hồ sơ: ${error.message}`);
};

export const changePassword = async (
  supabase: SupabaseClient,
  password: string,
): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(`Không đổi được mật khẩu: ${error.message}`);
};

export const loadProfile = async (
  supabase: SupabaseClient,
  user: User,
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return profileFromRow(data as unknown as ProfileRow, user.email ?? '');
};
