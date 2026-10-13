/**
 * Chuỗi của mô hình ba vai trò (Thumua365_BE docs/FRONTEND.md §5–6):
 * bước "Bác là ai?", tên loại tổ chức, tên vai trò, vỏ Nông dân, màn không có quyền.
 */

export const ROLE_LABELS = {
  // ─── Bước "Bác là ai?" ────────────────────────────────────────────────────
  setupTitle: 'Bác là ai?',
  setupSubtitle: 'Chọn đúng vai của bác để app hiện đúng những việc bác cần.',
  setupOrgName: 'Tên hiển thị',
  setupOrgNameHint: 'Ví dụ: Vựa Tư Hùng, Hộ cô Mai, Công ty Nông sản ABC.',
  setupName: 'Tên của bác',
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
  farmerIntro: 'Đây là trang của nông dân: theo dõi phiếu cân và tiền vựa còn nợ bác.',
  farmerSoonTitle: 'Sắp có',
  farmerSoonOrders: 'Tạo đơn bán cho vựa và xem lịch sử đơn.',
  farmerSoonDebts: 'Xem tiền từng vựa còn nợ bác.',
  farmerSoonLinks: 'Nhập mã kết nối vựa đưa để xem phiếu cân của mình.',
  farmerAccount: 'Tài khoản của bác',

  // ─── Không có quyền ───────────────────────────────────────────────────────
  noAccessTitle: 'Bác chưa có quyền vào mục này',
  noAccessHint: 'Mục này dành cho chủ hoặc quản lý. Nhờ chủ vựa / doanh nghiệp mở quyền nếu cần.',
  noAccessHome: 'Về trang chủ',
} as const;
