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

/** Mật khẩu tối thiểu — cho phép toàn số, vì tệp người dùng gõ trên bàn phím số. */
export const MIN_PASSWORD_LENGTH = 6;

/** Số phiên bản hiện lên màn Tài khoản — hỏi qua điện thoại là biết ngay bản nào. */
export const APP_VERSION = '1.0.0';

/** Kênh liên lạc mà tệp người dùng này thật sự dùng. */
export const SUPPORT_ZALO = '0912345678';

/**
 * Site giới thiệu và pháp lý — deploy riêng từ thư mục `site/`, không phải một
 * route của app. App ở `app.thumua365.vn`, site ở đây.
 */
export const SITE_URL = 'https://thumua365.vn';

export const LEGAL_LINKS = {
  terms: `${SITE_URL}/dieu-khoan.html`,
  privacy: `${SITE_URL}/quyen-rieng-tu.html`,
  guide: `${SITE_URL}/huong-dan.html`,
} as const;

/** Cách bao nhiêu ngày thì nhắc lại việc bổ sung email lấy lại mật khẩu. */
export const EMAIL_REMINDER_DAYS = 7;
