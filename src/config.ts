/**
 * Mọi hằng số nghiệp vụ. Không rải số ma thuật trong màn hình.
 * Đổi giá bán, đổi hạn dùng thử — sửa đúng một chỗ này.
 */

/** Số phiếu miễn phí mỗi tháng khi hết hạn dùng thử. */
export const FREE_RECEIPTS_PER_MONTH = 30;

/** Giá thuê bao tháng (đồng). */
export const PRICE_MONTHLY = 149_000;

/** Số ngày dùng thử đầy đủ tính từ lúc đăng ký. */
export const TRIAL_DAYS = 30;

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

/** Cách bao nhiêu ngày thì nhắc lại việc bổ sung email lấy lại mật khẩu. */
export const EMAIL_REMINDER_DAYS = 7;
