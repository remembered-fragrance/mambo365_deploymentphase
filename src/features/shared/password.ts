import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/config';
import { L } from '@/i18n/labels';

const COMMON_PASSWORDS = new Set([
  '123456', '12345678', '123456789', '1234567890', 'password', 'qwerty', 'abc123',
  'abcdef', 'abcdefgh', '000000', '00000000', '111111', '11111111', '123123',
  'iloveyou', 'admin', 'welcome', 'letmein', 'monkey', 'dragon', 'master',
  'matkhau', 'matkhau1', 'matkhau123', 'anhyeuem', 'yeuem', 'mothaiba',
]);

/**
 * Kiểm mật khẩu MỚI trước khi gửi — cùng luật ở mọi chỗ đặt mật khẩu (đăng ký, đổi, đặt lại qua
 * email, chủ tạo nhân viên). Không áp cho đăng nhập: mật khẩu cũ ngắn hơn vẫn phải vào được.
 */
export const passwordProblem = (password: string): string | undefined => {
  if (password.length < MIN_PASSWORD_LENGTH) return L.passwordTooShort;
  if (password.length > MAX_PASSWORD_LENGTH) return L.passwordTooLong;
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return L.passwordTooCommon;
  return undefined;
};
