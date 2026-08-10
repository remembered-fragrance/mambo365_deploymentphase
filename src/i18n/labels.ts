/**
 * MỘT chỗ duy nhất chứa mọi chuỗi hiển thị.
 *
 * Giọng văn: nói như ngoài chợ, không nói như phần mềm.
 * - Không viết tắt kép: viết "Cân được", không viết tắt hai chữ dính nhau.
 * - Nếu buộc phải dùng thuật ngữ kế toán (Tồn kho, Công nợ, Báo cáo thuế) thì
 *   phải có dòng phụ đề giải thích bằng lời thường — xem `SUB`.
 *
 * Luật: không viết chuỗi tiếng Việt thẳng vào JSX. Mọi chữ đi qua đây.
 *
 * `L` gộp từ ba mảnh — một file duy nhất sẽ vượt 300 dòng, mà đó cũng là luật
 * của dự án. Nơi dùng vẫn chỉ có một: `import { L } from '@/i18n/labels'`.
 */

import { ONBOARDING_LABELS } from './onboardingLabels';
import { SCREEN_LABELS } from './screenLabels';

const BASE = {
  // ─── Nhận dạng ─────────────────────────────────────────────────────────────
  appName: 'THUMUA365',
  purchaseReceipt: 'Phiếu thu mua',
  saleReceipt: 'Phiếu bán hàng',
  purchase: 'Mua',
  sale: 'Bán',

  // ─── Đối tác ───────────────────────────────────────────────────────────────
  supplier: 'Người bán',
  buyer: 'Người mua',
  walkIn: 'Khách lẻ',

  // ─── Dòng hàng ─────────────────────────────────────────────────────────────
  product: 'Mặt hàng',
  grossWeight: 'Cân được (kg)',
  tareWeight: 'Trừ bì (kg)',
  lossPercent: 'Trừ hao hụt',
  qualityPercent: 'Hàm lượng mủ',
  qualityGrade: 'Loại hàng',
  netWeight: 'Tính tiền theo',
  totalNetWeight: 'Tổng tính tiền',
  pricePerUnit: 'Đơn giá',
  rawTotal: 'Tạm tính',
  lineTotal: 'Thành tiền',
  unitOfMeasure: 'Cân theo',

  // ─── Cách tính ─────────────────────────────────────────────────────────────
  formulaEdit: 'Sửa cách tính',
  formulaStandard: 'Cân xong tính luôn',
  formulaNetAfterTare: 'Cân xong trừ bì',
  formulaRubberLatex: 'Cao su tính theo hàm lượng mủ',
  formulaLossPercent: 'Trừ hao hụt',

  // ─── Tiền ──────────────────────────────────────────────────────────────────
  total: 'Tổng phiếu',
  revenue: 'Doanh thu',
  paid: 'Đã trả',
  collected: 'Đã thu',
  remainingDebt: 'Còn nợ',
  remainingReceivable: 'Còn phải thu',
  paidInFull: 'Đã trả đủ',
  adjustments: 'Cộng / trừ thêm',
  addAmount: '+ Cộng thêm',
  subtractAmount: '− Trừ bớt',
  volumeDiscount: 'Bớt giá khi mua nhiều',
  pickupFee: 'Phí xe đến lấy',
  minWeightThreshold: 'Từ bao nhiêu kg trở lên',

  // ─── Chung ─────────────────────────────────────────────────────────────────
  time: 'Thời gian',
  note: 'Ghi chú',
  history: 'Lịch sử giao dịch',
  receiptCountUnit: 'phiếu',
  attachments: 'Ảnh phiếu cân / hoá đơn',

  // ─── Trạng thái phiếu nháp ────────────────────────────────────────────────
  draftWeighing: 'Đang cân',
  draftSaved: 'Để dành',

  // ─── Cột bảng xuất file ───────────────────────────────────────────────────
  colKind: 'Loại giao dịch',
  colReceiptId: 'Mã phiếu',
  colDate: 'Ngày',
  colParty: 'Đối tác',
  colProduct: 'Mặt hàng',
  colUnit: 'Đơn vị',
  colPayment: 'Thanh toán',
  sheetTransactions: 'Giao dịch',
  sheetSummary: 'Tổng hợp',
  sheetPurchases: 'Chi tiết mua',
  sheetSales: 'Chi tiết bán',

  // ─── Báo cáo thuế ─────────────────────────────────────────────────────────
  taxReport: 'Báo cáo thuế',
  taxMetric: 'Chỉ tiêu',
  taxValue: 'Giá trị',
  taxPeriod: 'Kỳ báo cáo',
  taxTotalPurchase: 'Tổng chi mua',
  taxTotalSale: 'Tổng doanh thu bán',
  taxGrossProfit: 'Tạm tính lời',
  taxPurchaseCount: 'Số phiếu mua',
  taxSaleCount: 'Số phiếu bán',

  // ─── Hành động ────────────────────────────────────────────────────────────
  save: 'Lưu',
  cancel: 'Bỏ qua',
  close: 'Đóng',
  confirm: 'Đồng ý',
  undo: 'Hoàn tác',
  del: 'Xoá',
  retry: 'Thử lại',
  reload: 'Tải lại',
  exportToFile: 'Lưu ra file',
  importFromFile: 'Lấy lại từ file',
  add: 'Thêm',
  dueDate: 'Hẹn ngày trả',
  addPhoto: 'Thêm ảnh',
  photoFull: 'Đủ số ảnh cho một phiếu rồi',
  removePhoto: 'Bỏ ảnh này',
  sendZalo: 'Gửi Zalo',
  print: 'In',
  callPhone: 'Gọi điện',
  clearAll: 'Xoá hết',
  next: 'Tiếp',
  systemKeyboard: 'Bàn phím thường',
  enterNumber: 'Nhập số',

  // ─── Điều hướng ───────────────────────────────────────────────────────────
  navDashboard: 'Tổng quan',
  navReceipts: 'Phiếu',
  navDebts: 'Công nợ',
  navMore: 'Thêm',
  groupDaily: 'Hằng ngày',
  groupPartners: 'Đối tác',
  groupGoods: 'Hàng hoá & Kho',
  groupReports: 'Báo cáo',
  groupAccount: 'Tài khoản',
  navSuppliers: 'Nông hộ',
  navBuyers: 'Người mua',
  navProducts: 'Mặt hàng',
  navInventory: 'Tồn kho',
  navProfile: 'Hồ sơ vựa',
  createPurchase: 'Tạo phiếu mua',
  createSale: 'Tạo phiếu bán',
  createReceipt: 'Tạo phiếu',
  comingSoon: 'Sắp có',

  // ─── Chế độ xem ───────────────────────────────────────────────────────────
  themeDay: 'Trong nhà',
  themeSun: 'Ngoài nắng',
  themeNight: 'Ban đêm',
  themeSwitch: 'Đổi chế độ xem',

  // ─── Đồng bộ ──────────────────────────────────────────────────────────────
  syncSynced: 'Đã lưu lên mạng',
  syncPending: 'Đang chờ gửi',
  syncOffline: 'Không có mạng',
  syncError: 'Chưa gửi được',
  syncOfflineBanner: 'Đang làm việc không có mạng',
  syncOfflineDetail: 'Phiếu vẫn ghi bình thường, có mạng lại sẽ tự gửi đi.',
  syncStuck: 'Có phiếu chưa gửi được',
  rowPending: 'Chưa gửi',
  rowConflict: 'Cần xem lại',

  // ─── Tổng quan ────────────────────────────────────────────────────────────
  spentToday: 'Đã chi mua hôm nay',
  todoToday: 'Việc cần làm hôm nay',
  todoWeighing: 'phiếu đang cân dở',
  todoDebts: 'người còn nợ tiền',
  todoNegativeStock: 'mặt hàng tồn âm',
  todoNothing: 'Xong hết rồi',
  spentWeek: 'Chi mua 7 ngày',
  spentMonth: 'Chi mua 30 ngày',
  last7Days: 'Bảy ngày gần đây',
  salesBlock: 'Bán ra 30 ngày',
  salesEmpty: 'Chưa có phiếu bán nào',
  salesEmptyHint: 'Bán hàng cho nhà máy thì tạo phiếu bán để theo dõi lời lỗ.',
  receiptsCount: 'phiếu',

  // ─── Danh sách phiếu ──────────────────────────────────────────────────────
  tabDone: 'Đã xong',
  filterAll: 'Tất cả',
  filterButton: 'Lọc',
  filterTitle: 'Lọc phiếu',
  filterPeriod: 'Khoảng thời gian',
  filterPayment: 'Thanh toán',
  filterKind: 'Loại phiếu',
  periodDay: 'Hôm nay',
  periodWeek: 'Tuần này',
  periodMonth: 'Tháng này',
  periodYear: 'Năm nay',
  periodAll: 'Tất cả',
  paymentPaid: 'Đã trả đủ',
  paymentUnpaid: 'Còn nợ',
  search: 'Tìm theo tên, mặt hàng, ghi chú',
  selectedCount: 'đã chọn',
  exportSelected: 'Xuất phiếu đã chọn',
  loadMore: 'Xem thêm',
  noReceipts: 'Chưa có phiếu nào',
  noReceiptsHint: 'Bấm nút tròn ở giữa thanh dưới để cân chuyến đầu tiên.',

  // ─── Tạo phiếu ────────────────────────────────────────────────────────────
  weighingNow: 'Đang cân',
  newCustomer: 'Khách mới',
  addLine: 'Thêm mặt hàng',
  removeLine: 'Bỏ dòng này',
  moreInfo: 'Thêm thông tin khác',
  lastTime: 'Lần trước',
  reuse: 'Dùng lại',
  payFullAndFinish: 'Trả đủ & xong',
  payPartAndFinish: 'Ghi nợ & xong',
  amountPaidNow: 'Trả bao nhiêu',
  reviewBeforeFinish: 'Xem lại trước khi chốt',
  savingDraft: 'Đang lưu',
  savedDraft: 'Đã lưu',
  nothingToFinish: 'Chưa đủ thông tin để chốt phiếu',

  // ─── Chi tiết phiếu ───────────────────────────────────────────────────────
  receiptNumber: 'Số phiếu',
  amountInWords: 'Bằng chữ',
  signatureLine: 'Người bán ký',
  madeWith: 'Lập bằng THUMUA365',
  deleteReceiptTitle: 'Xoá phiếu này?',
  businessNameFallback: 'Vựa nông sản',

  // ─── Thông báo ────────────────────────────────────────────────────────────
  loading: 'Đang tải…',
  errorTitle: 'Có lỗi xảy ra',
  errorHint: 'Dữ liệu của bạn vẫn còn trong máy. Tải lại trang hoặc lưu ra file để giữ an toàn.',
  notFoundTitle: 'Không có trang này',
  emptyTitle: 'Chưa có gì ở đây',
} as const;

export const L = { ...BASE, ...SCREEN_LABELS, ...ONBOARDING_LABELS } as const;

/** Phụ đề giải thích cho các thuật ngữ buộc phải giữ. */
export const SUB = {
  inventory: 'hàng còn trong kho',
  taxReport: 'số liệu để đi khai thuế',
  debt: 'ai nợ mình, mình nợ ai',
} as const;

export type LabelKey = keyof typeof L;
