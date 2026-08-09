/**
 * MỘT chỗ duy nhất chứa mọi chuỗi hiển thị.
 *
 * Giọng văn: nói như ngoài chợ, không nói như phần mềm.
 * - Không viết tắt kép ("KL/SL cân" → "Cân được").
 * - Nếu buộc phải dùng thuật ngữ kế toán (Tồn kho, Công nợ, Báo cáo thuế) thì
 *   phải có dòng phụ đề giải thích bằng lời thường — xem `SUB`.
 *
 * Luật: không viết chuỗi tiếng Việt thẳng vào JSX. Mọi chữ đi qua đây.
 */

export const L = {
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
  exportBackup: 'Lưu ra file',
  importBackup: 'Lấy lại từ file',
  sendZalo: 'Gửi Zalo',
  callPhone: 'Gọi điện',
  clearAll: 'Xoá hết',
  next: 'Tiếp',
  systemKeyboard: 'Bàn phím thường',
  enterNumber: 'Nhập số',

  // ─── Thông báo ────────────────────────────────────────────────────────────
  loading: 'Đang tải…',
  errorTitle: 'Có lỗi xảy ra',
  errorHint: 'Dữ liệu của bạn vẫn còn trong máy. Tải lại trang hoặc lưu ra file để giữ an toàn.',
  notFoundTitle: 'Không có trang này',
  emptyTitle: 'Chưa có gì ở đây',
} as const;

/** Phụ đề giải thích cho các thuật ngữ buộc phải giữ. */
export const SUB = {
  inventory: 'hàng còn trong kho',
  taxReport: 'số liệu để đi khai thuế',
  debt: 'ai nợ mình, mình nợ ai',
} as const;

export type LabelKey = keyof typeof L;
