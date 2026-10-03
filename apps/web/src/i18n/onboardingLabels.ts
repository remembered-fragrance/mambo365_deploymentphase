/**
 * Chuỗi của phần ĐÓN NGƯỜI DÙNG MỚI và các lối vào chung: màn hình chào,
 * chế độ trình diễn, nút "?", hướng dẫn lần đầu, đăng nhập, tìm nhanh.
 *
 * Đây là phần bản demo không có một dòng nào, mà theo KH Frontend §16.4 lại là
 * thứ quyết định người dùng có ở lại hay không. Chữ ở đây phải đọc lên nghe
 * như người thật nói với người thật.
 */

export const ONBOARDING_LABELS = {
  // ─── Màn hình chào ────────────────────────────────────────────────────────
  welcomeTitle: 'Sổ của bác còn trống',
  welcomeSubtitle: 'Chọn một trong ba cách dưới đây để bắt đầu.',
  welcomeCreate: 'Tạo phiếu đầu tiên',
  welcomeCreateHint: 'Cân một chuyến, app tính tiền và lưu lại.',
  welcomeDemo: 'Xem thử dữ liệu mẫu',
  welcomeDemoHint: 'Xem app hoạt động ra sao trước khi nhập số thật.',
  welcomeImport: 'Lấy lại dữ liệu từ file',
  welcomeImportHint: 'Đã dùng app ở máy khác thì lấy file sổ về đây.',

  // ─── Chế độ trình diễn ────────────────────────────────────────────────────
  demoBanner: 'Đang xem dữ liệu mẫu — số liệu này không phải của bác',
  demoClear: 'Xoá hết, bắt đầu thật',
  demoClearTitle: 'Xoá hết dữ liệu mẫu?',
  demoClearConsequence: 'Toàn bộ phiếu mẫu, nông hộ mẫu và ghi chú mẫu sẽ biến mất. Sổ về rỗng.',
  demoStarted: 'Đã nạp dữ liệu mẫu',
  demoEnded: 'Đã xoá hết dữ liệu mẫu',

  // ─── Nút "?" ──────────────────────────────────────────────────────────────
  helpButton: 'Trang này để làm gì',
  helpDashboard: 'Đây là trang đầu: hôm nay chi bao nhiêu tiền mua hàng, ai còn nợ, việc gì chưa xong. Bấm nút tròn màu xanh ở giữa thanh dưới để cân chuyến mới.',
  helpReceipts: 'Tất cả phiếu đã lập nằm ở đây. Tab "Đang cân" là phiếu đang cân dở, "Để dành" là phiếu chờ chốt sau. Bấm một dòng để xem lại hoặc in.',
  helpCreate: 'Chọn người bán, chọn mặt hàng, nhập số cân và giá — app tự tính tiền. Cân nhiều khách cùng lúc thì mỗi khách một ô ở thanh "Đang cân" phía trên.',
  helpDebts: 'Ai nợ mình, mình nợ ai. Phiếu quá hẹn trả nằm trên cùng. Bấm "Trả đủ" hoặc "Trả một phần" là ghi ngay, có 8 giây để hoàn tác nếu bấm nhầm.',
  helpInventory: 'Hàng còn trong kho, tính bằng cân thực tế đã mua trừ đi đã bán. Tồn âm nghĩa là có phiếu nhập sai, nên kiểm lại.',
  helpPartners: 'Danh bạ nông hộ và người mua. Bấm số điện thoại là gọi luôn. Sửa tên hoặc xoá khỏi danh bạ ở nút bên phải mỗi dòng.',
  helpProducts: 'Các mặt hàng bác thu mua và cách tính tiền của từng loại. Cao su tính theo hàm lượng mủ, điều và cà phê tính theo cân trừ bì.',
  helpPricing: 'Quy tắc tự cộng hoặc trừ tiền khi lập phiếu: phí xe đến lấy, bớt giá khi mua nhiều. Bật tắt được, xem trước tác dụng trước khi bật.',
  helpReports: 'Số liệu cộng sẵn theo kỳ để đi khai thuế. Xuất ra Excel đưa cho kế toán.',
  helpUtilities: 'Máy tính nhẩm nhanh cân × giá, và chỗ ghi những thứ hay quên.',
  helpProfile: 'Thông tin vựa, mật khẩu, cách hiển thị, và quan trọng nhất: lưu sổ ra file phòng khi mất máy.',

  // ─── Hướng dẫn 4 bước ─────────────────────────────────────────────────────
  coachTitle: 'Bốn bước cho phiếu đầu tiên',
  coachStep1: 'Một — chọn người bán, gõ tên mới cũng được.',
  coachStep2: 'Hai — chọn mặt hàng đang cân.',
  coachStep3: 'Ba — nhập số cân và đơn giá, app tự ra tiền.',
  coachStep4: 'Bốn — bấm "Trả đủ & xong" hoặc "Ghi nợ & xong".',
  coachGotIt: 'Đã hiểu, bắt đầu',
  coachSkip: 'Bỏ qua',

  // ─── Đăng nhập / đăng ký ──────────────────────────────────────────────────
  authSignIn: 'Đăng nhập',
  authSignUp: 'Tạo tài khoản',
  authTagline: 'Sổ thu mua nông sản — cân xong là xong sổ',
  authIdentifier: 'Tên tài khoản, số điện thoại hoặc email',
  authIdentifierHint: 'Không có email cũng dùng được. Số điện thoại là đủ.',
  authPassword: 'Mật khẩu',
  authPasswordHint: 'Ít nhất 6 ký tự. Để toàn số cũng được.',
  authName: 'Tên bác',
  authToSignUp: 'Chưa có tài khoản? Tạo mới',
  authToSignIn: 'Đã có tài khoản? Đăng nhập',
  authWorking: 'Đang xử lý…',
  authFailed: 'Chưa đăng nhập được',
  authNoServer: 'Máy chủ chưa được cấu hình — app đang ghi vào máy này',
  deviceBookTitle: 'Sổ đang nằm trên máy này',
  deviceBookBody: 'Bác đã ghi phiếu khi chưa đăng nhập. Đưa số phiếu đó vào tài khoản để đồng bộ được.',
  deviceBookImport: 'Đưa sổ của máy vào tài khoản',
  deviceBookImported: 'Đã đưa sổ của máy vào tài khoản',
  deviceBookDismiss: 'Không cần',

  // ─── Tìm nhanh ────────────────────────────────────────────────────────────
  searchTitle: 'Tìm nhanh',
  searchHint: 'Gõ tên khách, mặt hàng hoặc ghi chú',
  searchShortcut: 'Ctrl + K',
  searchEmpty: 'Không tìm thấy gì',
  searchTypeMore: 'Gõ thêm một chữ nữa',
  searchGroupParty: 'Đối tác',
  searchGroupProduct: 'Mặt hàng',
  searchGroupReceipt: 'Phiếu',
} as const;
