/**
 * Chuỗi của phần kinh doanh: gói dịch vụ, hạn mức, thanh toán, mã mời, nhập file.
 *
 * Giọng văn quan trọng hơn ở đây so với mọi màn khác. Đây là chỗ duy nhất app
 * hỏi tiền, mà người đọc là chủ vựa đang bận cân hàng — không ai đọc một bảng
 * so sánh tính năng. Vì vậy câu chặn hạn mức nói bằng SỐ CỦA CHÍNH HỌ, và mọi
 * lời hứa đều nói thẳng cái mất: hết hạn thì ngừng đồng bộ, không khoá sổ.
 */

export const BILLING_LABELS = {
  // ─── Bậc gói ──────────────────────────────────────────────────────────────
  planTitle: 'Gói dịch vụ',
  planFree: 'Gói miễn phí',
  planPremium: 'Gói trả phí',
  planTrial: 'Đang dùng thử',
  planGrace: 'Vừa hết hạn',
  planExpired: 'Đã hết hạn',
  planEndsOn: 'Dùng tới ngày',
  planDaysLeft: 'ngày nữa',
  planUpgrade: 'Nâng cấp',
  planSeePlans: 'Xem gói trả phí',
  planCompareTitle: 'Miễn phí và trả phí khác nhau chỗ nào',

  // ─── Nội dung so sánh ─────────────────────────────────────────────────────
  featureReceipts: 'Ghi phiếu',
  /** Ghép sau con số hạn mức: "30 phiếu mỗi tháng". Số lấy từ `config.ts`. */
  featureReceiptsPerMonth: 'phiếu mỗi tháng',
  featureReceiptsPaid: 'Không giới hạn',
  featureParties: 'Nông hộ và người mua',
  featurePartiesFree: 'Lưu tên và số điện thoại',
  featurePartiesPaid: 'Kèm lịch sử mua bán và dư nợ từng người',
  featureDebts: 'Công nợ',
  featureDebtsFree: 'Không có',
  featureDebtsPaid: 'Ai nợ mình, mình nợ ai, hẹn ngày trả',
  featureExport: 'Xuất Excel và PDF',
  featureSync: 'Giữ sổ trên mạng',
  featureSyncFree: 'Sổ nằm trong một máy',
  featureSyncPaid: 'Nhiều máy dùng chung một sổ, mất máy vẫn còn sổ',
  featureYes: 'Có',
  featureNo: 'Không',

  // ─── Hạn mức ──────────────────────────────────────────────────────────────
  quotaWallTitle: 'Tháng này bác đã ghi hết số phiếu miễn phí',
  quotaWallBody:
    'Nâng cấp để ghi không giới hạn, xem công nợ và giữ sổ trên mạng phòng khi mất máy.',
  quotaUsed: 'Đã ghi tháng này',
  quotaOfLimit: 'trên',
  quotaLeftWarning: 'Còn ghi được',
  quotaResetHint: 'Sang tháng mới số phiếu tự đếm lại từ đầu.',
  quotaDraftsKept: 'Phiếu đang cân dở vẫn còn nguyên, không mất đi đâu.',

  // ─── Giá ──────────────────────────────────────────────────────────────────
  priceMonthly: 'Trả từng tháng',
  priceYearly: 'Trả cả năm',
  priceYearlyHint: 'Trả cả năm được tặng 2 tháng',
  pricePerMonth: 'mỗi tháng',
  pricePerYear: 'mỗi năm',

  // ─── Chuyển khoản ─────────────────────────────────────────────────────────
  payTitle: 'Chuyển khoản để mở gói',
  payBank: 'Ngân hàng',
  payAccountNumber: 'Số tài khoản',
  payAccountName: 'Chủ tài khoản',
  payAmount: 'Số tiền',
  payContent: 'Nội dung chuyển khoản',
  payContentWarning:
    'Gõ đúng nội dung này vào ô "Nội dung" trong app ngân hàng. Gõ sai thì gọi Zalo hỗ trợ, tiền vẫn vào và vẫn mở gói được.',
  payQrAlt: 'Mã QR chuyển khoản',
  payQrOffline: 'Không tải được mã QR. Chuyển khoản tay theo số tài khoản ở trên.',
  payWaiting: 'Đang chờ tiền vào…',
  payWaitingHint: 'Thường mất dưới một phút. Cứ đóng màn này, gói tự mở khi tiền tới.',
  payDone: 'Đã nhận tiền, gói đã mở',
  payCopy: 'Chép',
  payCopied: 'Đã chép',
  payHistory: 'Lịch sử thanh toán',
  payNoHistory: 'Chưa có lần thanh toán nào',
  payReceiptNote: 'Đây là biên nhận trong app, không phải hoá đơn đỏ.',
  payStatusPending: 'Đang chờ',
  payStatusPaid: 'Đã nhận',
  payStatusFailed: 'Không thành',
  payStatusExpired: 'Đã huỷ',
  payRefundNote: 'Đổi ý trong 7 ngày đầu thì nhắn Zalo, hoàn lại tiền.',
  payNoAutoRenew: 'Không tự động trừ tiền. Hết hạn thì bác chủ động chuyển tiếp.',

  // ─── Banner ───────────────────────────────────────────────────────────────
  bannerTrialLeft: 'Dùng thử còn',
  bannerGrace: 'Gói đã hết hạn, còn gửi lên mạng thêm',
  bannerExpired: 'Gói đã hết hạn — sổ vẫn dùng được trên máy này, chỉ ngừng gửi lên mạng',
  bannerExpiredCta: 'Mở lại',
  syncBlocked: 'Chưa gửi lên mạng vì gói đã hết hạn',
  syncBlockedDetail: 'Phiếu vẫn ghi bình thường và sẽ tự gửi đi khi mở lại gói.',

  // ─── Mã mời ───────────────────────────────────────────────────────────────
  referralTitle: 'Mã mời của bác',
  referralHint: 'Người quen đăng ký bằng mã này thì hệ thống ghi nhận là bác giới thiệu.',
  referralNone: 'Chưa có mã',
  referralAtSignUp: 'Mã mời (nếu có)',
  referralAtSignUpHint: 'Ai chỉ bác dùng app thì gõ mã của họ vào đây.',

  // ─── Nhập từ file Excel ───────────────────────────────────────────────────
  importTitle: 'Nhập từ file Excel',
  importSubtitle: 'chuyển danh sách nông hộ và phiếu cũ vào app',
  importKindSuppliers: 'Danh sách nông hộ',
  importKindReceipts: 'Phiếu cũ',
  importTemplate: 'Tải file mẫu',
  importPick: 'Chọn file',
  importPreviewTitle: 'Xem trước trước khi nhập',
  importRowsFound: 'dòng đọc được',
  importConfirm: 'Nhập vào sổ',
  importDone: 'Đã nhập xong',
  importErrorsTitle: 'File có dòng chưa đúng — chưa nhập gì cả',
  importErrorsHint: 'Sửa những dòng dưới đây trong Excel rồi chọn lại file.',
  importRow: 'Dòng',
  importColumn: 'cột',
  importMoreErrors: 'dòng lỗi nữa chưa hiện ra',
  errEmptyFile: 'File không có dòng dữ liệu nào',
  errMissingColumn: 'File thiếu cột bắt buộc',
  errMissingName: 'Thiếu tên',
  errMissingProduct: 'Thiếu mặt hàng',
  errBadDate: 'Ngày không đọc được',
  errBadNumber: 'Không phải số',
  importReadFailed: 'Không đọc được file này. Lưu lại dạng .xlsx hoặc .csv rồi thử lại.',
} as const;
