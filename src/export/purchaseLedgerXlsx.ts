/**
 * Bảng kê thu mua dạng 02/TNDN (KE_HOACH_GOI_PRO V12) — mỗi dòng hàng của phiếu mua một dòng.
 * Số liệu do `core/taxReport.ts` (`buildPurchaseLedger`) dựng; file này chỉ lo việc ghi file.
 *
 * Cột địa chỉ, CCCD người bán để TRỐNG: sổ không lưu (§4.2), người dùng tự điền. Dòng đầu file là câu
 * tự chịu trách nhiệm — app không hứa "đúng mẫu".
 */

import { formatDate } from '@mambo/core/format';
import {
  buildPurchaseLedger,
  buildSalesLedger,
  TAX_REPORT_DISCLAIMER,
  type LedgerPaidBy,
  type PurchaseLedgerRow,
  type TaxReportRange,
} from '@mambo/core/taxReport';
import type { AppData } from '@mambo/core/types';
import { L } from '@/i18n/labels';

const PAID_BY: Record<LedgerPaidBy, string> = {
  cash: L.paidByCash,
  transfer: L.paidByTransfer,
  mixed: L.paidByMixed,
  unpaid: L.paidByUnpaid,
};

const header = (partyColumn: string) => [
  L.colIndex,
  L.colDate,
  partyColumn,
  L.colSellerAddress,
  L.colSellerIdNumber,
  L.colProduct,
  L.colQuantity,
  L.colUnit,
  L.colUnitPrice,
  L.colAmount,
  L.colPaidBy,
];

const ledgerSheet = (
  rows: readonly PurchaseLedgerRow[],
  title: string,
  partyColumn: string,
  range: TaxReportRange,
): (string | number)[][] => {
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return [
    [`${title} — ${range.label}`],
    [TAX_REPORT_DISCLAIMER],
    [],
    header(partyColumn),
    ...rows.map((r, i) => [
      i + 1,
      formatDate(r.date),
      r.sellerName,
      '',
      '',
      r.product ?? L.ledgerAdjustment,
      r.quantity ?? '',
      r.unit ?? '',
      r.unitPrice ?? '',
      r.amount,
      PAID_BY[r.paidBy],
    ]),
    ['', '', '', '', '', '', '', '', L.ledgerTotal, total, ''],
  ];
};

export const purchaseLedgerSheet = (data: AppData, range: TaxReportRange): (string | number)[][] =>
  ledgerSheet(buildPurchaseLedger(data, range), L.taxLedgerExport, L.colSellerName, range);

/** (V17) Bảng kê bán ra — cùng cột với bảng kê thu mua, cột tên là người mua. */
export const salesLedgerSheet = (data: AppData, range: TaxReportRange): (string | number)[][] =>
  ledgerSheet(buildSalesLedger(data, range), L.salesLedgerTitle, L.colBuyerName, range);

export const LEDGER_COLS = [6, 12, 24, 28, 16, 20, 12, 8, 12, 16, 22].map((wch) => ({ wch }));

export const exportPurchaseLedgerXlsx = async (data: AppData, range: TaxReportRange, filename: string): Promise<void> => {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(purchaseLedgerSheet(data, range));
  sheet['!cols'] = LEDGER_COLS;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, L.taxLedgerSheet);
  XLSX.writeFile(wb, filename);
};
