import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/config';
import { L } from '@/i18n/labels';

/**
 * Kiểm mật khẩu MỚI trước khi gửi — cùng luật ở mọi chỗ đặt mật khẩu (đăng ký, đổi, đặt lại qua
 * email, chủ tạo nhân viên). Không áp cho đăng nhập: mật khẩu cũ ngắn hơn vẫn phải vào được.
 */
export const passwordProblem = (password: string): string | undefined => {
  if (password.length < MIN_PASSWORD_LENGTH) return L.passwordTooShort;
  if (password.length > MAX_PASSWORD_LENGTH) return L.passwordTooLong;
  return undefined;
};
