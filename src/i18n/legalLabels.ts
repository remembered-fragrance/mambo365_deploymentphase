/**
 * Chuỗi của phần pháp lý: đồng ý điều khoản, liên kết ra site, xoá tài khoản.
 *
 * Giọng văn ở đây phải **đúng trước khi hay**. Mỗi câu là một lời hứa đối chiếu
 * được với hệ thống thật: "xoá là xoá hẳn" thì `delete_own_account()` phải xoá
 * hẳn, "trả lời trong ngày làm việc" thì đừng viết 24/7. Viết một đằng hệ thống
 * làm một nẻo là cạm bẫy số một của giai đoạn G.
 */

export const LEGAL_LABELS = {
  // ─── Liên kết ra site ─────────────────────────────────────────────────────
  legalTitle: 'Điều khoản & quyền riêng tư',
  legalTerms: 'Điều khoản sử dụng',
  legalPrivacy: 'Chính sách quyền riêng tư',
  legalGuide: 'Hướng dẫn dùng',

  // ─── Đồng ý khi đăng ký ───────────────────────────────────────────────────
  consentPrefix: 'Tôi đồng ý với',
  consentAnd: 'và',
  consentRequired: 'Phải đồng ý điều khoản mới đăng ký được',

  // ─── Hỗ trợ ───────────────────────────────────────────────────────────────
  supportHours: 'Trả lời trong ngày làm việc, 7h–19h. Một người trực, không phải 24/7.',

  // ─── Xoá tài khoản ────────────────────────────────────────────────────────
  deleteAccountTitle: 'Xoá tài khoản',
  deleteAccountHint:
    'Gửi yêu cầu xoá tài khoản. Cần đóng hoặc chuyển quyền không gian đang sở hữu; yêu cầu sẽ được xử lý sau khi đối chiếu dữ liệu và nghĩa vụ lưu trữ.',
  deleteAccountSaveFirst: 'Nên bấm "Lưu ra file" ở trên trước khi xoá.',
  deleteAccountButton: 'Gửi yêu cầu xoá tài khoản',
  deleteAccountTypeName: 'Gõ lại tên vựa để xác nhận',
  deleteAccountMismatch: 'Chưa khớp tên vựa',
  deleteAccountWorking: 'Đang gửi yêu cầu…',
  deleteAccountDone: 'Đã gửi yêu cầu xoá tài khoản',
} as const;
