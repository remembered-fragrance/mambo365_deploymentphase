/**
 * Chuỗi của trang quản trị `/quan-tri` — chỉ người vận hành THUMUA365 đọc (máy chủ chặn bằng `ADMIN_USER_IDS`).
 *
 * Giọng văn: nhắc đúng việc phải làm TRƯỚC khi bấm (xem tận mắt giao dịch, xác minh đúng người), vì hai nút ở đây
 * chạm vào tiền và tài khoản của khách.
 */

export const ADMIN_LABELS = {
  adminTitle: 'Quản trị',
  adminSubtitle: 'Mỗi lần mở gói hay đặt lại mật khẩu đều ghi vào nhật ký quản trị, kèm tên người duyệt.',

  // ─── Không vào được ───────────────────────────────────────────────────────
  adminDeniedTitle: 'Bạn không vào được trang quản trị',
  adminForbidden: 'Tài khoản bạn đang đăng nhập không phải quản trị viên. Trang này chỉ dành cho người vận hành THUMUA365.',
  adminSignedOut: 'Phiên đăng nhập đã hết hạn. Bạn đăng xuất, đăng nhập lại rồi mở lại trang này.',
  adminUnavailable: 'Máy chủ chưa có chức năng quản trị (trả về 404). Bạn kiểm lại phiên bản API đang chạy.',
  adminOffline: 'Không kết nối được máy chủ — kiểm tra mạng rồi thử lại.',

  // ─── Dùng chung hai form ──────────────────────────────────────────────────
  adminApprovedBy: 'Người duyệt',
  adminApprovedByHint: 'Tên của bạn — ghi vào nhật ký quản trị.',
  adminReason: 'Lý do (không bắt buộc)',
  adminErrApprovedBy: 'Ghi tên người duyệt, từ 2 đến 80 ký tự.',
  adminErrReason: 'Lý do tối đa 300 ký tự.',

  // ─── Mở gói bằng tay ──────────────────────────────────────────────────────
  adminActivateTitle: 'Mở gói bằng tay',
  adminActivateHint:
    'Dùng khi khách chuyển khoản sai nội dung hoặc thiếu tiền. Bạn xem tận mắt giao dịch trong app ngân hàng trước khi mở.',
  adminTarget: 'Số điện thoại của chủ, hoặc mã tổ chức',
  adminTargetHint: 'Số điện thoại chỉ dùng được khi người đó là chủ của đúng một tổ chức có gói.',
  adminPlan: 'Gói',
  adminPlanKeep: 'Giữ gói đang có',
  adminPlanHint: 'Doanh nghiệp không có gói Thương lái / Vựa — để "Giữ gói đang có".',
  adminMonths: 'Số tháng',
  adminMonthsUnit: 'tháng',
  adminExtraStaff: 'Người cân mua thêm',
  adminKeep: 'Giữ nguyên',
  adminAmount: 'Số tiền đã nhận',
  adminBankTxId: 'Mã giao dịch ngân hàng',
  adminBankTxIdHint: 'Chép đúng mã trong app ngân hàng — mã này chống cộng trùng khi báo có về sau.',
  adminActivateSubmit: 'Mở gói',
  adminActivateConfirmTitle: 'Mở gói cho khách này?',
  /** Ghép: "Tổ chức của chủ có số 0905112233 · Gói Vựa · 12 tháng · 449.000₫ · …". */
  adminConfirmOwner: 'Tổ chức của chủ có số',
  adminConfirmOrg: 'Tổ chức có mã',
  /** Máy chủ báo số điện thoại là chủ của nhiều tổ chức — kèm danh sách để chọn. */
  adminPickOrg: 'Bạn chọn đúng tổ chức cần mở gói:',
  adminActivatedTitle: 'Đã mở gói',
  adminAlreadyProcessed: 'Mã giao dịch này đã được xử lý trước đó — không cộng thêm kỳ nào.',
  adminResultOrg: 'Tổ chức',
  adminResultNoEnd: 'Không có ngày hết hạn',
  adminErrTarget: 'Nhập số điện thoại của chủ (ít nhất 9 số) hoặc mã tổ chức.',
  adminErrMonths: 'Số tháng từ 1 đến 36.',
  adminErrAmount: 'Số tiền là số đồng nguyên, không âm.',
  adminErrBankTxId: 'Mã giao dịch từ 3 đến 100 ký tự.',

  // ─── Đặt lại mật khẩu ─────────────────────────────────────────────────────
  adminResetTitle: 'Đặt lại mật khẩu cho khách',
  adminResetHint:
    'Chỉ làm sau khi bạn đã xác minh đúng người qua điện thoại hoặc Zalo. Người đã có email khôi phục thì tự đặt lại bằng "Quên mật khẩu?".',
  adminResetPhone: 'Số điện thoại đăng nhập của khách',
  adminResetNewPassword: 'Mật khẩu mới',
  adminResetSubmit: 'Đặt lại mật khẩu',
  adminResetConfirmTitle: 'Đặt lại mật khẩu của người này?',
  /** Ghép: "Tài khoản có số 0905112233 sẽ không đăng nhập được bằng mật khẩu cũ nữa." */
  adminResetConfirmPrefix: 'Tài khoản có số',
  adminResetConfirmSuffix: 'sẽ không đăng nhập được bằng mật khẩu cũ nữa.',
  /** Ghép: "Đã đặt mật khẩu mới cho số 0905112233. Bạn báo …". */
  adminResetDonePrefix: 'Đã đặt mật khẩu mới cho số',
  adminResetDoneSuffix: 'Bạn báo mật khẩu mới cho khách và nhắc họ đổi lại sau khi đăng nhập.',
  adminErrPhone: 'Số điện thoại cần ít nhất 9 số.',

  // ─── Giao dịch mua gói (chờ API) ──────────────────────────────────────────
  adminPaymentsTitle: 'Giao dịch mua gói',
  adminPaymentsSoon: 'Danh sách giao dịch sẽ hiện ở đây khi máy chủ có API cho phần này.',

  // ─── Phễu đo lường ────────────────────────────────────────────────────────
  adminFunnelTitle: 'Phễu đo lường',
  adminFunnelRange: 'Khoảng thời gian',
  /** Ghép sau số ngày: "30 ngày gần đây". */
  adminFunnelDays: 'ngày gần đây',
  adminFunnelEvent: 'Sự kiện',
  adminFunnelOrgType: 'Loại tài khoản',
  adminFunnelAnon: 'Chưa đăng nhập',
  adminFunnelEvents: 'Số lần',
  adminFunnelOrgs: 'Số tổ chức',
  adminFunnelDevices: 'Số máy',
  adminFunnelFirst: 'Lần đầu',
  adminFunnelLast: 'Lần cuối',
  adminFunnelEmpty: 'Chưa có sự kiện nào trong khoảng này.',
} as const;
