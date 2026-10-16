/**
 * Quên mật khẩu · xác nhận email khôi phục (BE 0.16.0).
 *
 * Thư do API gửi (Brevo), KHÔNG phải thư của Supabase: email đăng nhập là email nội bộ
 * `84…@id.thumua365.vn`, không ai nhận. Chỉ email khôi phục ĐÃ XÁC NHẬN nhận link đặt lại mật khẩu.
 * Link đặt lại mang `token_hash` của Supabase ⇒ `openRecoverySession` (store) cho một phiên, rồi
 * `changePassword` đặt mật khẩu mới.
 */

import type { RecoveryEmailVerifyResult } from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { L } from '@/i18n/labels';
import { api } from './client';

const mailError = (err: unknown): Error => {
  if (err instanceof TypeError) return new Error(L.recoveryOffline, { cause: err });
  if (err instanceof ApiError && err.code === 'EMAIL_UNAVAILABLE') return new Error(L.recoveryMailUnavailable, { cause: err });
  if (err instanceof ApiError && err.code === 'RATE_LIMITED') return new Error(L.recoveryRateLimited, { cause: err });
  return new Error(err instanceof ApiError && err.requestId ? `${L.recoveryFailed} (id: ${err.requestId})` : L.recoveryFailed, { cause: err });
};

/** Luôn "đã gửi nếu có" — máy chủ không cho biết tài khoản có tồn tại hay không. */
export const requestPasswordReset = async (identifier: string): Promise<void> => {
  try {
    await api.requestPasswordReset({ identifier: identifier.trim() });
  } catch (err) {
    throw mailError(err);
  }
};

/** Email vừa xác nhận; `null` = link sai, đã dùng, hết hạn, hoặc email đã đổi sau khi gửi. */
export const confirmRecoveryEmail = async (token: string): Promise<string | null> => {
  try {
    return (await api.confirmRecoveryEmail({ token })).email;
  } catch (err) {
    // Link bị cắt / sửa tay ⇒ mã sai hình dạng (422): cùng nghĩa với link hỏng.
    if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') return null;
    throw mailError(err);
  }
};

export const sendVerificationMail = async (): Promise<RecoveryEmailVerifyResult['status']> => {
  try {
    return (await api.account.verifyRecoveryEmail()).status;
  } catch (err) {
    throw mailError(err);
  }
};
