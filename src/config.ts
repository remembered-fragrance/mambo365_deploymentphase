/**
 * Mọi hằng số nghiệp vụ. Không rải số ma thuật trong màn hình.
 * Đổi giá bán, đổi hạn dùng thử — sửa đúng một chỗ này.
 */

/** Số phiếu miễn phí mỗi tháng khi hết hạn dùng thử. */
export const FREE_RECEIPTS_PER_MONTH = 30;

/**
 * Giá thuê bao tháng (đồng).
 * 🔴 Mô hình tài chính CP4 §11.1 xây trên đúng con số này. Đổi giá phải qua
 * Linh (finance), không phải một lần sửa file.
 */
export const PRICE_MONTHLY = 149_000;

/** Giá thuê bao năm — tặng 2 tháng. Nông nghiệp theo mùa vụ, chủ vựa có tiền
 * vào mùa và quen trả một lần, nên đây là gói cần đẩy. */
export const PRICE_YEARLY = 1_490_000;

/** Số tháng gia hạn cho mỗi mức giá. Webhook suy ra kỳ hạn từ số tiền nhận được. */
export const MONTHS_PER_PRICE: Readonly<Record<number, number>> = {
  [PRICE_MONTHLY]: 1,
  [PRICE_YEARLY]: 12,
};

/** Số ngày dùng thử đầy đủ tính từ lúc đăng ký. */
export const TRIAL_DAYS = 30;

/**
 * Hết kỳ rồi vẫn đồng bộ thêm bấy nhiêu ngày, kèm banner nhắc.
 * 🔴 Trùng với `sync_grace_days()` trong migration 0008 — đổi phải đổi cả hai.
 */
export const GRACE_DAYS = 7;

/** Cửa sổ hoàn tiền, nói rõ trong Điều khoản. */
export const REFUND_DAYS = 7;

/**
 * Tài khoản nhận chuyển khoản.
 *
 * Chưa có pháp nhân nên pilot dùng tài khoản cá nhân + đối soát tay/Casso.
 * `BANK_BIN` là mã ngân hàng theo chuẩn VietQR (danh sách ở vietqr.io).
 * 🔴 Ba giá trị dưới đây là chỗ điền — thay bằng số thật trước khi mở bán.
 */
export const BANK_BIN = '970422';
export const BANK_ACCOUNT_NUMBER = '0000000000';
export const BANK_ACCOUNT_NAME = 'NGUYEN THE TAI';
export const BANK_NAME = 'MB Bank';

/** Chờ bao lâu sau lần gõ cuối thì tự lưu nháp (ms). */
export const AUTOSAVE_MS = 700;

/** Số ảnh chứng từ tối đa cho một phiếu. */
export const MAX_ATTACHMENTS = 5;

/** Thời gian còn hoàn tác được sau một hành động ghi tiền / xoá (ms). */
export const UNDO_MS = 8_000;

/**
 * Mật khẩu 8–72 ký tự, toàn số cũng được (tệp người dùng gõ trên bàn phím số). MỘT luật cho đăng ký,
 * đổi mật khẩu, đặt lại qua email và chủ tạo tài khoản nhân viên — lấy từ contracts (BE 0.16.0), cùng
 * số với máy chủ và với "Minimum password length" của Supabase Auth. Trước đây đăng ký 6, nhân viên 8.
 */
export { PASSWORD_MAX_LENGTH as MAX_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH as MIN_PASSWORD_LENGTH } from '@mambo/contracts';

/** Số phiên bản hiện lên màn Tài khoản — hỏi qua điện thoại là biết ngay bản nào. */
export const APP_VERSION = '1.0.0';

/** Kênh liên lạc mà tệp người dùng này thật sự dùng. */
export const SUPPORT_ZALO = '0969158913';

/**
 * Ba trang pháp lý & hướng dẫn là route CÔNG KHAI của chính app (đọc được khi
 * chưa đăng nhập, vừa xoá tài khoản, hay mở từ ô đồng ý lúc đăng ký) — không
 * phụ thuộc landing `site/` chưa xuất bản. Nội dung: `src/i18n/legal/`.
 */
export const LEGAL_LINKS = {
  terms: '/dieu-khoan',
  privacy: '/quyen-rieng-tu',
  guide: '/huong-dan',
} as const;

/**
 * Hai trang mở từ link trong thư — công khai, ngoài cổng đăng nhập (người quên mật khẩu chưa đăng
 * nhập được). Máy chủ dựng link bằng đúng hai đường dẫn này (Thumua365_BE `RecoveryMailService`).
 */
export const MAIL_LINKS = {
  resetPassword: '/dat-lai-mat-khau',
  confirmEmail: '/xac-nhan-email',
} as const;

/** Phiên bản và ngày áp dụng của Điều khoản + Chính sách — đổi nội dung thì đổi cả hai. */
export const LEGAL_VERSION = '2.4';
export const LEGAL_EFFECTIVE_DATE = '25/10/2026';

/**
 * Thông tin chủ thể vận hành — Luật BVDLCN 2025 và Luật TMĐT 2025 bắt buộc công khai.
 * 🔴 Chỗ điền: thay bằng thông tin thật (Nguyên) trước khi mở cho người dùng thật.
 * Để `null` thì trang hiện "đang cập nhật" thay vì bịa.
 */
export const LEGAL_OPERATOR: {
  readonly name: string | null;
  readonly address: string | null;
  readonly email: string | null;
} = {
  name: null,
  address: null,
  email: null,
};

/** Vùng máy chủ của project Supabase (Tài xác nhận). `null` ⇒ "đang cập nhật". */
export const DATA_REGION: string | null = null;

/** Cách bao nhiêu ngày thì nhắc lại việc bổ sung email lấy lại mật khẩu. */
export const EMAIL_REMINDER_DAYS = 7;
