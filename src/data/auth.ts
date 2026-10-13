/**
 * Đăng ký / đăng nhập / bootstrap tổ chức.
 *
 * Khoá đăng nhập Supabase LUÔN là email nội bộ sinh từ SĐT (`849…@id.thumua365.vn`),
 * kể cả khi người dùng khai thêm email thật. Email thật chỉ là email khôi phục:
 * backend ghi vào hồ sơ ở bước "Bạn là ai?" để đăng nhập bằng email tra ra đúng
 * tài khoản đó. Trước đây có email thì dùng email làm khoá ⇒ một người thành hai
 * tài khoản (issue #9).
 *
 * Quy tắc đăng nhập:
 * - Số điện thoại: thử email nội bộ; không được thì hỏi resolveIdentifier
 *   (tài khoản cũ đăng ký bằng email thật).
 * - Email: thử thẳng (tài khoản cũ); không được thì hỏi resolveIdentifier
 *   (email khôi phục → email nội bộ).
 * - Tên đăng nhập: resolve qua API rồi mới đăng nhập Supabase.
 *
 * 🔴 Lỗi đăng nhập luôn dùng cùng một câu:
 * "Tài khoản hoặc mật khẩu không đúng".
 *
 * Không gọi trực tiếp bảng `profiles` qua PostgREST.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Me, MeBootstrapInput, MeProfile, MeProfilePatch } from '@mambo/contracts';
import { detectIdentifierKind, normalizePhone } from '@mambo/core/identifier';
import type { UserProfile } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { api, setCurrentOrg } from './client';
import { profileFromMe, profileFromRow } from './authProfile';
import { claimReferral } from './billing';
import { track } from './track';

export { profileFromMe, profileFromRow };

/** Tên miền nội bộ dùng cho tài khoản chỉ có số điện thoại. */
const INTERNAL_EMAIL_DOMAIN = 'id.thumua365.vn';

export const SIGN_IN_ERROR = 'Tài khoản hoặc mật khẩu không đúng';

const PHONE_TAKEN = L.authPhoneTaken;

const signUpErrorMessage = (message: string | undefined): string =>
  message && /already|registered|exists/i.test(message) ? PHONE_TAKEN : message ?? 'Không tạo được tài khoản';

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

/**
 * Hỏi backend email đăng nhập của định danh rồi thử. `alreadyTried` = email vừa thử
 * thất bại: backend trả đúng email đó (hoặc email mồi cùng hình dạng) thì thôi, khỏi
 * gọi Supabase lần nữa. Lỗi gì cũng trả null — người gọi báo MỘT câu chung.
 */
const signInViaBackend = async (
  supabase: SupabaseClient,
  identifier: string,
  password: string,
  alreadyTried: string,
): Promise<User | null> => {
  try {
    const resolved = await api.resolveIdentifier({ identifier });
    const email = resolved?.email?.trim().toLowerCase();
    if (!email || email === alreadyTried.toLowerCase()) return null;
    return await signInWithEmail(supabase, email, password);
  } catch {
    return null;
  }
};

export const signIn = async (supabase: SupabaseClient, identifier: string, password: string): Promise<User> => {
  try {
    const user = await signInOnce(supabase, identifier, password);
    track('login_succeeded', { method: detectIdentifierKind(identifier.trim()) });
    return user;
  } catch (err) {
    const reason = err instanceof TypeError ? 'network' : err instanceof Error && err.message === SIGN_IN_ERROR ? 'wrong_credentials' : 'other';
    track('login_failed', { reason });
    throw err;
  }
};

const signInOnce = async (
  supabase: SupabaseClient,
  identifier: string,
  password: string,
): Promise<User> => {
  const rawIdentifier = identifier.trim();

  if (!rawIdentifier || !password) {
    throw new Error(SIGN_IN_ERROR);
  }

  const kind = detectIdentifierKind(rawIdentifier);

  // 1. Email: tài khoản cũ dùng chính email này làm khoá; tài khoản mới dùng
  //    email nội bộ và email này là email khôi phục — backend tra hộ.
  if (kind === 'email') {
    const email = rawIdentifier.toLowerCase();
    const directUser = await signInWithEmail(supabase, email, password);
    if (directUser) return directUser;

    const resolvedUser = await signInViaBackend(supabase, rawIdentifier, password, email);
    if (resolvedUser) return resolvedUser;
    throw new Error(SIGN_IN_ERROR);
  }

  // 2. Số điện thoại:
  //    thử đúng email nội bộ được tạo bởi signUp() trước.
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

    // Tài khoản cũ đăng ký bằng email thật: khoá là email đó, backend tra từ SĐT.
    const resolvedUser = await signInViaBackend(supabase, rawIdentifier, password, generatedEmail);
    if (resolvedUser) return resolvedUser;
    throw new Error(SIGN_IN_ERROR);
  }

  // 3. Tên đăng nhập: backend là nơi duy nhất biết username thuộc email nào.
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
  if (!phone) throw new Error(L.authPhoneInvalid);

  const recoveryEmail =
    input.email && detectIdentifierKind(input.email.trim()) === 'email'
      ? input.email.trim().toLowerCase()
      : undefined;

  /*
   * SĐT là khoá đăng nhập duy nhất ⇒ mỗi số đúng một tài khoản; số đã đăng ký
   * thì Supabase báo trùng. Email thật chỉ đi vào user_metadata.recoveryEmail,
   * backend ghi thành email khôi phục ở bước "Bạn là ai?".
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
    throw new Error(signUpErrorMessage(error?.message));
  }
  // Supabase (khi tắt "Confirm email") trả user GIẢ, không có identities, nếu email
  // đã có tài khoản — để không lộ ai đã đăng ký. Với ta email = SĐT ⇒ số đã dùng.
  if (data.user.identities?.length === 0) {
    throw new Error(PHONE_TAKEN);
  }

  // Mã giới thiệu ghi nhận SAU khi có tài khoản; mã không dùng được thì thôi, không chặn đăng ký.
  const referral = input.referralCode?.trim();
  if (referral) await claimReferral(referral).catch(() => false);

  return data.user;
};

export const bootstrap = async (input: MeBootstrapInput): Promise<Me> => {
  const me = await api.meBootstrap(input);
  track('sign_up_completed', { orgType: input.orgType });
  return me;
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
  /** Rỗng = bỏ tên đăng nhập. */
  readonly username?: string;
  /** Email khôi phục; rỗng = bỏ. */
  readonly email?: string;
}

/**
 * Sửa hồ sơ: `PATCH /v1/me/profile` trước (server kiểm trùng tên đăng nhập / email
 * khôi phục, ghi bảng `profiles` mà đăng nhập bằng email / tên tra vào), rồi chép tên +
 * email sang `user_metadata` — `/v1/me` đọc hai thứ đó từ Supabase, không đồng bộ thì
 * tải lại trang sẽ hiện giá trị cũ.
 */
export const updateProfile = async (
  supabase: SupabaseClient,
  _userId: string,
  patch: ProfilePatch,
): Promise<MeProfile> => {
  const body: MeProfilePatch = {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.username !== undefined ? { username: patch.username.trim().toLowerCase() || null } : {}),
    ...(patch.email !== undefined ? { recoveryEmail: patch.email.trim().toLowerCase() || null } : {}),
  };
  const saved = await api.account.updateProfile(body);
  await supabase.auth.updateUser({
    data: {
      name: saved.name,
      ...(body.recoveryEmail !== undefined ? { recoveryEmail: saved.recoveryEmail } : {}),
    },
  });
  return saved;
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

export const loadProfile = async (
  _supabase: SupabaseClient,
  user: User,
): Promise<UserProfile | null> => {
  try {
    const me = await api.me();
    return profileFromMe(me, user);
  } catch {
    return {
      id: user.id,
      identifier:
        (user.user_metadata?.phone as string | undefined) ??
        user.phone ??
        user.email ??
        '',
      name:
        (user.user_metadata?.name as string | undefined) ??
        '',
      email: user.email ?? undefined,
      phone:
        (user.user_metadata?.phone as string | undefined) ??
        user.phone ??
        undefined,
    };
  }
};
