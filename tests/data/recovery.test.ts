import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@mambo/sdk';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/config';
import { L } from '@/i18n/labels';

const calls = vi.hoisted(() => ({ reset: vi.fn(), confirm: vi.fn(), verify: vi.fn() }));
vi.mock('@/data/client', () => ({
  api: {
    requestPasswordReset: calls.reset,
    confirmRecoveryEmail: calls.confirm,
    account: { verifyRecoveryEmail: calls.verify },
  },
}));

const { confirmRecoveryEmail, requestPasswordReset, sendVerificationMail } = await import('@/data/recovery');
const { passwordProblem } = await import('@/features/shared/password');

beforeEach(() => {
  calls.reset.mockReset();
  calls.confirm.mockReset();
  calls.verify.mockReset();
});

describe('một luật mật khẩu (BE 0.16.0)', () => {
  it('8–72 ký tự ở mọi chỗ đặt mật khẩu; toàn số được', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(MAX_PASSWORD_LENGTH).toBe(72);
    expect(passwordProblem('1234567')).toBe(L.passwordTooShort);
    expect(passwordProblem('12345678')).toBe(L.passwordTooCommon);
    expect(passwordProblem('kh0eMạnh')).toBeUndefined();
    expect(passwordProblem('x'.repeat(72))).toBeUndefined();
    expect(passwordProblem('x'.repeat(73))).toBe(L.passwordTooLong);
  });

  it('nhãn nói đúng con số', () => {
    expect(L.authPasswordHint).toContain(String(MIN_PASSWORD_LENGTH));
    expect(L.passwordTooShort).toContain(String(MIN_PASSWORD_LENGTH));
    expect(L.memberPassword).toContain(`${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH}`);
  });
});

describe('quên mật khẩu', () => {
  it('gửi định danh đã cắt khoảng trắng; máy chủ trả ok là xong', async () => {
    calls.reset.mockResolvedValue({ ok: true });
    await requestPasswordReset('  0907 000 111 ');
    expect(calls.reset).toHaveBeenCalledWith({ identifier: '0907 000 111' });
  });

  it('chưa gửi được thư / quá nhiều lần / mất mạng → câu dễ hiểu', async () => {
    calls.reset.mockRejectedValueOnce(new ApiError('EMAIL_UNAVAILABLE', 503, 'x'));
    await expect(requestPasswordReset('a')).rejects.toThrow(L.recoveryMailUnavailable);
    calls.reset.mockRejectedValueOnce(new ApiError('RATE_LIMITED', 429, 'x'));
    await expect(requestPasswordReset('a')).rejects.toThrow(L.recoveryRateLimited);
    calls.reset.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(requestPasswordReset('a')).rejects.toThrow(L.recoveryOffline);
  });
});

describe('xác nhận email', () => {
  it('trả email vừa xác nhận; link hỏng / bị cắt → null', async () => {
    calls.confirm.mockResolvedValueOnce({ email: 'lan@example.com' });
    expect(await confirmRecoveryEmail('t'.repeat(43))).toBe('lan@example.com');
    calls.confirm.mockResolvedValueOnce({ email: null });
    expect(await confirmRecoveryEmail('t'.repeat(43))).toBeNull();
    calls.confirm.mockRejectedValueOnce(new ApiError('VALIDATION_FAILED', 422, 'x'));
    expect(await confirmRecoveryEmail('ngan')).toBeNull();
  });

  it('gửi lại thư: trả trạng thái của máy chủ', async () => {
    calls.verify.mockResolvedValueOnce({ status: 'too_soon' });
    expect(await sendVerificationMail()).toBe('too_soon');
    calls.verify.mockRejectedValueOnce(new ApiError('EMAIL_UNAVAILABLE', 503, 'x'));
    await expect(sendVerificationMail()).rejects.toThrow(L.recoveryMailUnavailable);
  });

  it('🔴 email đã được tài khoản khác xác nhận (C4): báo đổi email, không coi là link hỏng', async () => {
    const taken = () => new ApiError('VALIDATION_FAILED', 422, 'x', undefined, { reason: 'EMAIL_TAKEN' });
    calls.confirm.mockRejectedValueOnce(taken());
    await expect(confirmRecoveryEmail('t'.repeat(43))).rejects.toThrow(L.emailTaken);
    calls.verify.mockRejectedValueOnce(taken());
    await expect(sendVerificationMail()).rejects.toThrow(L.emailTaken);
  });
});
