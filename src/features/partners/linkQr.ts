/**
 * QR của mã kết nối (FRONTEND §5.6): QR chỉ là cách khác để chuyển CÙNG mã đó. Nông dân quét bằng
 * camera điện thoại → mở `/ket-noi?ma=…` → ô nhập mã điền sẵn. Backend không cần thêm gì.
 *
 * Vẽ ngay trong máy — KHÔNG gửi mã cho dịch vụ vẽ QR bên ngoài: ai có mã là xem được công nợ.
 */

import { ROUTES } from '../shared/navItems';

export const linkUrl = (code: string): string => `${window.location.origin}${ROUTES.connect}?ma=${code}`;

/** Ảnh SVG của QR, dạng data URL. Thư viện nạp động — không vào gói lúc mở app. */
export const qrImage = async (text: string): Promise<string> => {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }))}`;
};
