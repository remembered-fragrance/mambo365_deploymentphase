/** Dựng `UserProfile` hiển thị từ hàng `profiles` hoặc từ `/v1/me` + phiên Supabase. */

import type { User } from '@supabase/supabase-js';
import type { Me } from '@mambo/contracts';
import type { UserProfile } from '@/core/types';
import type { MeProfile } from './profileApi';
import type { ProfileRow } from './rows';

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

const metaText = (account: User | null | undefined, key: string): string | undefined => {
  const value = account?.user_metadata?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};

/** `84912345678@id.thumua365.vn` → `+84912345678`; email khác → undefined. */
const phoneFromInternalEmail = (email: string | undefined): string | undefined => {
  const match = email ? /^(84\d{8,10})@id\.thumua365\.vn$/i.exec(email.trim()) : null;
  return match?.[1] ? `+${match[1]}` : undefined;
};

/**
 * Hồ sơ hiển thị từ `/v1/me`, bù bằng tài khoản Supabase của phiên. API cũ (≤ v0.11.0)
 * trả `phone: null` với tài khoản đăng ký bằng SĐT (số chỉ nằm trong email nội bộ) và
 * không trả email khôi phục ⇒ hồ sơ hiện "—" dù người dùng đã khai cả hai.
 */
export const profileFromMe = (me: Me, account?: User | null): UserProfile => {
  const phone = me.user.phone ?? phoneFromInternalEmail(account?.email) ?? metaText(account, 'phone');
  const email = me.user.email ?? metaText(account, 'recoveryEmail');
  return {
    id: me.user.id,
    identifier: phone ?? email ?? account?.email ?? '',
    name: me.user.name ?? metaText(account, 'name') ?? '',
    email,
    phone,
    businessName: me.memberships[0]?.organization.name ?? undefined,
  };
};

/** Phủ tên, tên đăng nhập, email khôi phục, mã mời từ `/v1/me/profile` lên hồ sơ đang hiện. */
export const mergeProfile = (current: UserProfile, profile: MeProfile): UserProfile => ({
  ...current,
  name: profile.name || current.name,
  username: profile.username ?? undefined,
  email: profile.recoveryEmail ?? undefined,
  phone: profile.phone ?? current.phone,
  referralCode: profile.referralCode ?? current.referralCode,
});
