/**
 * Nhãn của gói Pro Đợt 2 (KE_HOACH_GOI_PRO): nhật ký, sao kê công nợ, bảng kê thu mua, hình thức trả, báo cáo
 * tổng theo gói, vượt số chi nhánh. Gộp vào `L` ở `labels.ts`.
 */

export const PRO_LABELS = {
  // ─── Màn so sánh gói ──────────────────────────────────────────────────────
  featureAudit: 'Nhật ký sửa, xoá',
  featureAuditFree: 'Vẫn ghi lại, chưa xem được',
  featureAuditPaid: 'Ai sửa, xoá phiếu nào, lúc nào',
  featureStatement: 'Sao kê công nợ gửi khách',
  featureStatementFree: 'Xem công nợ trong app',
  featureStatementPaid: 'Gửi ảnh, PDF qua Zalo, Messenger',
  featureTaxLedger: 'Bảng kê thu mua (mẫu 02/TNDN)',
  featureTaxLedgerFree: 'Báo cáo thuế tổng',
  featureTaxLedgerPaid: 'Xuất bảng kê thu mua theo kỳ từ sổ của bạn',
  featurePayTransfer: 'Trả nông hộ bằng chuyển khoản',
  featurePayTransferFree: 'Ghi số tiền đã trả',
  featurePayTransferPaid: 'Ghi hình thức trả, chép nội dung chuyển khoản, nhắc khi trả tiền mặt từ 5 triệu/ngày',
  featureOrgReport: 'Báo cáo việc từng người, báo cáo tổng',
  featureOrgReportFree: 'Không',

  // ─── Bức tường ────────────────────────────────────────────────────────────
  gateAudit: 'Nhật ký vẫn được ghi đầy đủ ở mọi gói — gia hạn gói Pro để xem lại ai sửa, xoá gì.',
  gateStatement: 'Công nợ vẫn xem được trong app — gói Pro gửi được sao kê cho khách.',
  gateTaxLedger: 'Báo cáo thuế tổng vẫn xem, xuất được — gói Pro xuất thêm bảng kê thu mua theo kỳ.',
  gateReports: 'Sổ, phiếu, công nợ vẫn xem được trong app — gói Pro xem việc từng người và báo cáo tổng.',

  // ─── Nhật ký ──────────────────────────────────────────────────────────────
  navAudit: 'Nhật ký',
  auditSubtitle: 'Ai sửa, xoá gì trong sổ — mới nhất trước',
  auditEmpty: 'Chưa có việc nào được ghi',
  auditPerson: 'Người làm',
  auditEveryone: 'Mọi người',
  auditMore: 'Xem thêm',
  auditSystem: 'Hệ thống',
  auditNoteEmpty: '(trống)',
  auditPhotos: 'ảnh',
  auditNote: 'Ghi chú',
  auditReceiptOf: 'Phiếu ngày',
  auditPaymentOf: 'Lần trả ngày',
  auditOpenReceipt: 'Xem phiếu',
  auditFailed: 'Chưa tải được nhật ký',
  auditActOrganizationBootstrapped: 'Tạo sổ',
  auditActOrganizationUpdated: 'Đổi tên tổ chức',
  auditActReceiptUpdated: 'Sửa ghi chú, ảnh của phiếu',
  auditActReceiptDeleted: 'Xoá phiếu',
  auditActPaymentVoided: 'Huỷ lần trả',
  auditActMemberAdded: 'Thêm người',
  auditActMemberRemoved: 'Gỡ người',
  auditActMemberLeft: 'Người rời tổ chức',
  auditActMemberRoleChanged: 'Đổi vai trò, chi nhánh của người',
  auditActLinkInvited: 'Mời kết nối',
  auditActLinkAccepted: 'Nhận kết nối',
  auditActLinkRevoked: 'Ngắt kết nối',
  auditActBranchCreated: 'Tạo chi nhánh',
  auditActBranchUpdated: 'Sửa chi nhánh',
  auditActBranchOverLimit: 'Đang dùng nhiều chi nhánh hơn gói cho',
  auditActPlaceCreated: 'Thêm địa điểm trên bản đồ',
  auditActPlaceUpdated: 'Sửa địa điểm trên bản đồ',
  auditActPlaceDeleted: 'Xoá địa điểm trên bản đồ',
  auditActPlanActivated: 'Kích hoạt gói',
  auditActPlanReferralBonus: 'Được thưởng giới thiệu',

  // ─── Sao kê công nợ ───────────────────────────────────────────────────────
  statement: 'Sao kê',
  statementTitle: 'Sao kê công nợ',
  statementPayableHeading: 'Chúng tôi còn nợ bạn',
  statementReceivableHeading: 'Bạn còn nợ chúng tôi',
  statementAsOf: 'Tính đến',
  statementReceipt: 'Phiếu',
  statementReceiptTotal: 'tổng',
  statementRemaining: 'còn',
  statementShareImage: 'Chia sẻ ảnh',
  statementSharePdf: 'Chia sẻ PDF',
  statementZaloAuto: 'Tự gửi Zalo',
  zaloOaLocked:
    'Tự gửi tin Zalo cần tài khoản Zalo chính thức của doanh nghiệp — sẽ mở khi có. Bây giờ bấm "Chia sẻ" rồi chọn Zalo.',
  statementShared: 'Đã mở chia sẻ sao kê',
  statementDownloaded: 'Đã tải sao kê về máy',

  // ─── Bảng kê thu mua ──────────────────────────────────────────────────────
  taxLedgerExport: 'Bảng kê thu mua',
  taxLedgerSheet: 'Bảng kê',
  taxLedgerConfirmTitle: 'Trước khi xuất bảng kê',
  taxLedgerConfirmBody:
    'File gồm các phiếu mua trong kỳ, mỗi dòng hàng một dòng. Cột CCCD và địa chỉ người bán để trống — app không lưu, bạn tự điền.',
  taxLedgerIUnderstand: 'Tôi hiểu',
  colIndex: 'STT',
  colSellerName: 'Tên người bán',
  colSellerAddress: 'Địa chỉ',
  colSellerIdNumber: 'Số CCCD',
  colQuantity: 'Số lượng',
  colUnitPrice: 'Đơn giá',
  colAmount: 'Thành tiền',
  colPaidBy: 'Hình thức trả',
  ledgerAdjustment: 'Cộng / trừ khác',
  ledgerTotal: 'Tổng cộng',
  paidByCash: 'Tiền mặt',
  paidByTransfer: 'Chuyển khoản',
  paidByMixed: 'Tiền mặt + chuyển khoản',
  paidByUnpaid: 'Chưa trả',

  // ─── Hình thức trả ────────────────────────────────────────────────────────
  payMethod: 'Trả bằng',
  copyTransfer: 'Chép nội dung chuyển khoản',
  transferCopied: 'Đã chép nội dung chuyển khoản',
  transferCopyFailed: 'Máy không cho chép — gõ tay nội dung',
  transferContentLabel: 'Nội dung chuyển khoản',
  cashReminderTitle: 'Trả tiền mặt từ 5 triệu đồng/ngày',
  cashReminderToday: 'Hôm nay đã trả tiền mặt cho người này',
  cashReminderBody:
    'Khoản mua từ 5 triệu đồng/ngày của một người bán cần trả bằng chuyển khoản mới được tính vào chi phí khi kê khai thuế.',
  cashReminderUseTransfer: 'Đổi sang chuyển khoản',
  cashReminderKeepCash: 'Vẫn trả tiền mặt',

  // ─── Chi nhánh vượt gói (C2) ──────────────────────────────────────────────
  branchOverLimitPrefix: 'Đang dùng',
  branchOverLimitMiddle: 'chi nhánh, gói hiện tại cho',
  branchOverLimitSuffix:
    '. Chi nhánh đang có vẫn dùng bình thường; muốn thêm chi nhánh mới thì lưu trữ bớt hoặc nâng gói.',
} as const;
