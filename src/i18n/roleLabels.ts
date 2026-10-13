/**
 * Chuỗi của mô hình ba vai trò (Thumua365_BE docs/FRONTEND.md §5–6):
 * bước "Bác là ai?", tên loại tổ chức, tên vai trò, vỏ Nông dân, màn không có quyền.
 */

export const ROLE_LABELS = {
  // ─── Bước "Bác là ai?" ────────────────────────────────────────────────────
  setupTitle: 'Bác là ai?',
  setupSubtitle: 'Chọn đúng vai của bác để app hiện đúng những việc bác cần.',
  setupOrgNameTrader: 'Tên vựa',
  setupOrgNameTraderHint: 'Ví dụ: Vựa Tư Hùng. In ở đầu phiếu, nhân viên trong vựa thấy chung.',
  setupOrgNameEnterprise: 'Tên doanh nghiệp',
  setupOrgNameEnterpriseHint: 'Ví dụ: Công ty Nông sản ABC. In ở đầu phiếu, nhân viên thấy chung.',
  setupName: 'Tên hiển thị',
  setupUsername: 'Tên đăng nhập (không bắt buộc)',
  setupUsernameHint: '3–32 ký tự a-z, 0-9, dấu chấm, gạch dưới. Không được giống số điện thoại.',
  setupSubmit: 'Bắt đầu dùng',
  setupWorking: 'Đang tạo…',
  setupFailed: 'Chưa tạo được, bác thử lại nhé',
  setupPickType: 'Bác chọn một vai trước đã',
  setupSignOut: 'Đăng xuất',

  // ─── Loại tổ chức (OrgType) ───────────────────────────────────────────────
  orgFarmer: 'Nông dân',
  orgFarmerHint: 'Bán nông sản cho vựa. Xem phiếu cân, tiền vựa còn nợ. Miễn phí.',
  orgTrader: 'Thương lái / Vựa',
  orgTraderHint: 'Sổ thu mua: phiếu cân, công nợ, kho, đối tác, báo cáo. Dùng thử 30 ngày.',
  orgEnterprise: 'Doanh nghiệp',
  orgEnterpriseHint: 'Như vựa, thêm nhân viên và chi nhánh. Dùng thử 30 ngày.',

  // ─── Vai trò trong tổ chức (MemberRole) ───────────────────────────────────
  roleOwner: 'Chủ',
  roleManager: 'Quản lý',
  roleStaff: 'Nhân viên',
  traderStaff: 'Người cân',

  // ─── Thẻ tổ chức ở trang Tài khoản ────────────────────────────────────────
  orgCardTitle: 'Tổ chức đang làm việc',
  orgCardType: 'Loại',
  orgCardRole: 'Vai trò',
  orgCardBranch: 'Chi nhánh',
  orgCardSwitch: 'Đổi tổ chức',

  // ─── Vỏ Nông dân ──────────────────────────────────────────────────────────
  farmerHello: 'Chào bác',
  farmerIntro: 'Xem phiếu cân và tiền từng vựa còn nợ bác — đúng như trên biên nhận vựa ghi.',
  farmerSoonTitle: 'Sắp có',
  farmerSoonOrders: 'Tạo đơn bán cho vựa và xem lịch sử đơn.',
  farmerAccount: 'Tài khoản của bác',
  farmerTradersTitle: 'Các vựa đã kết nối',
  farmerNoTraders: 'Chưa kết nối vựa nào',
  farmerNoTradersHint: 'Xin vựa mã kết nối rồi nhập vào ô bên trên.',
  farmerTheyOwe: 'Vựa còn nợ bác',
  farmerYouOwe: 'Bác còn nợ vựa',
  farmerLastReceipt: 'Phiếu gần nhất',
  farmerBackHome: 'Về trang chủ',
  farmerReceiptsTitle: 'Phiếu cân vựa ghi cho bác',
  farmerNoReceipts: 'Vựa chưa ghi phiếu nào cho bác',
  farmerKindTheyBought: 'Vựa mua của bác',
  farmerKindTheySold: 'Vựa bán cho bác',
  farmerTraderMissing: 'Không thấy vựa này trong danh sách đã kết nối',

  // ─── Kết nối (mã kết nối) ─────────────────────────────────────────────────
  linkClaimTitle: 'Nhập mã kết nối',
  linkClaimHint: 'Mã 8 chữ vựa đưa bác, ví dụ K7M2-QX9P',
  linkClaimButton: 'Kết nối',
  linkClaimed: 'Đã kết nối với',
  linkCodeInvalid: 'Mã không đúng hoặc đã hết hạn, xin vựa mã mới',
  linkCodeShape: 'Mã gồm 8 chữ và số, không có số 0, 1 và chữ O, I, L',
  linkRateLimited: 'Thử sai nhiều quá, đợi một phút rồi nhập lại',
  linkRequired: 'Cần kết nối trước',
  linkOffline: 'Chưa có mạng — việc này cần mạng',
  linkFailed: 'Không tải được, bác thử lại sau một lát',
  linkRevoke: 'Huỷ kết nối',
  linkRevokeConsequence: 'Huỷ thì không xem được phiếu của bên này nữa. Muốn xem lại phải xin mã mới.',
  linkRevoked: 'Đã huỷ kết nối',
  partnerLinkTitle: 'Kết nối tài khoản',
  partnerLinkHint: 'Mời người này dùng app để tự xem phiếu và tiền còn nợ. Đưa mã tận tay hoặc gửi qua Zalo.',
  partnerInvite: 'Mời kết nối',
  partnerInviteCode: 'Mã kết nối',
  partnerInviteExpires: 'Hết hạn',
  partnerInviteShare: 'Gửi mã',
  partnerInviteQrAlt: 'Mã QR kết nối — quét bằng camera điện thoại',
  partnerInviteShareText: 'Mời bác dùng THUMUA365 để xem phiếu cân và tiền còn nợ. Mã kết nối của bác:',
  partnerLinked: 'Đã kết nối với',
  partnerNotSynced: 'Người này chưa lên máy chủ — đợi đồng bộ xong rồi mời lại',

  // ─── Không có quyền ───────────────────────────────────────────────────────
  noAccessTitle: 'Bác chưa có quyền vào mục này',
  noAccessHint: 'Mục này dành cho chủ hoặc quản lý. Nhờ chủ vựa / doanh nghiệp mở quyền nếu cần.',
  noAccessHome: 'Về trang chủ',
} as const;
