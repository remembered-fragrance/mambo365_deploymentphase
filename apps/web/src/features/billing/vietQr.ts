/**
 * URL ảnh mã QR chuyển khoản theo chuẩn VietQR.
 *
 * Dựng bằng chuỗi, không thêm thư viện: ảnh QR là một địa chỉ có sẵn quy tắc,
 * còn tự sinh QR phía client thì kéo theo một thư viện chỉ để vẽ mấy ô vuông
 * (§3.5 — tự viết tốn >1 buổi thì mới thêm thư viện, đây thì không).
 *
 * 🔴 Ảnh này cần mạng. Vì vậy màn thanh toán LUÔN hiện đủ số tài khoản, số
 * tiền và nội dung bằng chữ — quét QR chỉ là đường tắt, không phải đường duy nhất.
 */

import { BANK_ACCOUNT_NAME, BANK_ACCOUNT_NUMBER, BANK_BIN } from '@/config';

export const vietQrImageUrl = (amount: number, content: string): string => {
  const query = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: content,
    accountName: BANK_ACCOUNT_NAME,
  });
  return `https://img.vietqr.io/image/${BANK_BIN}-${BANK_ACCOUNT_NUMBER}-compact2.png?${query}`;
};
