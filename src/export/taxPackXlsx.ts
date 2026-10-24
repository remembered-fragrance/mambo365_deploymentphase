/**
 * Bộ hồ sơ kê khai (KE_HOACH_GOI_PRO V17) — dựng trên bảng kê thu mua (V12): một file Excel, mỗi phần một sheet.
 *   Tổng hợp · Bảng kê mua vào · Bảng kê bán ra · Chứng từ (danh sách phiếu, số ảnh đính kèm)
 *
 * Ảnh chứng từ không nhúng vào file: ảnh nằm trên máy chủ, xem ở từng phiếu theo mã phiếu.
 */

import { transactionTotals } from '@mambo/core/calc';
import { formatDate } from '@mambo/core/format';
import { buildTaxReport, isInRange, TAX_REPORT_DISCLAIMER, type TaxReportRange } from '@mambo/core/taxReport';
import type { AppData } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { LEDGER_COLS, purchaseLedgerSheet, salesLedgerSheet } from './purchaseLedgerXlsx';

export const taxSummarySheet = (data: AppData, range: TaxReportRange): (string | number)[][] => {
  const report = buildTaxReport(data, range);
  return [
    [`${L.taxPackExport} — ${range.label}`],
    [TAX_REPORT_DISCLAIMER],
    [],
    [L.taxTotalPurchase, report.totalPurchase],
    [L.taxTotalSale, report.totalSale],
    [L.taxGrossProfit, report.grossProfit],
    [L.taxPurchaseCount, report.purchaseCount],
    [L.taxSaleCount, report.saleCount],
  ];
};

/** Mỗi phiếu một dòng, theo ngày. Mã phiếu là mã in trên biên nhận. */
export const receiptListSheet = (data: AppData, range: TaxReportRange): (string | number)[][] => [
  [L.colIndex, L.colDate, L.receiptNumber, L.taxPackKind, L.taxPackParty, L.colAmount, L.paid, L.taxPackPhotos, L.note],
  ...data.transactions
    .filter((t) => isInRange(t.date, range))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t, i) => [
      i + 1,
      formatDate(t.date),
      t.id.slice(0, 8).toUpperCase(),
      t.kind === 'sale' ? L.sale : L.purchase,
      t.supplierName,
      transactionTotals(t).total,
      t.amountPaid,
      t.attachmentIds?.length ?? 0,
      t.note ?? '',
    ]),
];

export const exportTaxPackXlsx = async (data: AppData, range: TaxReportRange, filename: string): Promise<void> => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const add = (rows: (string | number)[][], name: string, cols: number[]) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = cols.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, sheet, name);
  };
  add(taxSummarySheet(data, range), L.sheetSummary, [28, 18]);
  add(purchaseLedgerSheet(data, range), L.taxPackPurchaseSheet, LEDGER_COLS.map((c) => c.wch));
  add(salesLedgerSheet(data, range), L.taxPackSaleSheet, LEDGER_COLS.map((c) => c.wch));
  add(receiptListSheet(data, range), L.taxPackReceiptSheet, [6, 12, 12, 8, 24, 16, 16, 8, 30]);
  XLSX.writeFile(wb, filename);
};
