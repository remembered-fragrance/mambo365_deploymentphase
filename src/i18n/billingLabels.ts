/**
 * Chuỗi của phần kinh doanh: gói dịch vụ, hạn mức, thanh toán, mã mời, nhập file.
 *
 * Giọng văn quan trọng hơn ở đây so với mọi màn khác. Đây là chỗ duy nhất app
 * hỏi tiền, mà người đọc là chủ vựa đang bận cân hàng — không ai đọc một bảng
 * so sánh tính năng. Vì vậy câu chặn hạn mức nói bằng SỐ CỦA CHÍNH HỌ, và mọi
 * lời hứa đều nói thẳng cái mất: hết hạn thì ngừng đồng bộ, không khoá sổ.
 */

export const BILLING_LABELS = {
  billingContact: 'Gói doanh nghiệp tính theo số chi nhánh và kích hoạt tay — nhắn Zalo hỗ trợ để được báo giá.',
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
  featurePartiesDetail: 'Tên, số điện thoại, lịch sử mua bán và dư nợ từng người',
  featureDebts: 'Công nợ',
  featureDebtsDetail: 'Ai nợ mình, mình nợ ai, hẹn ngày trả',
  featureExport: 'Xuất Excel và PDF',
  featureSync: 'Giữ sổ trên mạng',
  featureSyncFree: 'Sổ nằm trong một máy',
  featureSyncPaid: 'Nhiều máy dùng chung một sổ, mất máy vẫn còn sổ',
  featureStaff: 'Người cân',
  featureStaffFree: 'Không thêm được',
  /** Ghép sau con số: "Tối đa 3 người". Số lấy từ `STAFF_LIMIT` của contracts. */
  featureStaffPaidPrefix: 'Tối đa',
  featureStaffPaidSuffix: 'người',
  featurePhotos: 'Ảnh phiếu cân, hoá đơn',
  featurePhotosFree: 'Xem ảnh cũ, không gửi ảnh mới',
  featurePhotosPaid: 'Chụp ảnh gắn vào phiếu, lưu trên mạng',
  featureYes: 'Có',

  // ─── Hạn mức ──────────────────────────────────────────────────────────────
  quotaWallTitle: 'Tháng này bạn đã ghi hết số phiếu miễn phí',
  quotaWallBody:
    'Nâng cấp để ghi không giới hạn, thêm người cân và giữ sổ trên mạng phòng khi mất máy.',
  quotaUsed: 'Đã ghi tháng này',
  quotaOfLimit: 'trên',
  quotaLeftWarning: 'Còn ghi được',
  quotaResetHint: 'Sang tháng mới số phiếu tự đếm lại từ đầu.',
  quotaDraftsKept: 'Phiếu đang cân dở vẫn còn nguyên, không mất đi đâu.',

  // ─── Việc cần gói (PlanGate) ────────────────────────────────────────────────
  gateMembers: 'Gói đã hết hạn — người đang có vẫn làm bình thường, gia hạn để thêm người mới.',
  gatePhotos: 'Gói đã hết hạn — ảnh cũ vẫn xem được, gia hạn để chụp ảnh mới.',
  gateBranches: 'Gói đã hết hạn — chi nhánh đang có vẫn giữ nguyên, gia hạn để thêm hoặc dùng lại chi nhánh.',
  gateSeePlans: 'Xem gói',
  gateAskOwner: 'Báo chủ gia hạn gói để dùng tiếp.',
  planRequired: 'Gói đã hết hạn — gia hạn để làm việc này.',
  staffUsed: 'người cân',
  staffFull: 'Đã đủ số người cân của gói. Cần thêm thì nhắn Zalo hỗ trợ.',
  memberLimit: 'Gói hiện tại cho tối đa số người cân:',

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
  payNoAutoRenew: 'Không tự động trừ tiền. Hết hạn thì bạn chủ động chuyển tiếp.',

  // ─── Banner ───────────────────────────────────────────────────────────────
  bannerTrialLeft: 'Dùng thử còn',
  bannerGrace: 'Gói đã hết hạn, còn gửi lên mạng thêm',
  bannerExpired: 'Gói đã hết hạn — sổ vẫn dùng được trên máy này, chỉ ngừng gửi lên mạng',
  bannerExpiredCta: 'Mở lại',
  /** Người không trả tiền được (người cân, quản lý): không có nút Mở lại, chỉ báo chủ. */
  bannerExpiredStaff: 'Gói đã hết hạn — sổ vẫn ghi bình thường, chỉ tạm ngừng gửi lên mạng. Báo chủ gia hạn.',
  syncBlocked: 'Chưa gửi lên mạng vì gói đã hết hạn',
  syncBlockedDetail: 'Phiếu vẫn ghi bình thường và sẽ tự gửi đi khi mở lại gói.',

  // ─── Mã mời ───────────────────────────────────────────────────────────────
  referralTitle: 'Mã mời của bạn',
  referralHint: 'Người quen đăng ký bằng mã này thì hệ thống ghi nhận là bạn giới thiệu.',
  referralNone: 'Chưa có mã',
  referralAtSignUp: 'Mã mời (nếu có)',
  referralAtSignUpHint: 'Ai chỉ bạn dùng app thì gõ mã của họ vào đây.',

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
