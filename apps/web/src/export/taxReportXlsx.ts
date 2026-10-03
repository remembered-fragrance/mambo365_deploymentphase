/**
 * Xuất báo cáo thuế ra Excel 3 sheet.
 * Số liệu do `core/taxReport.ts` tính; file này chỉ lo việc ghi file.
 */

import { transactionTotals } from '@/core/calc';
import { formatDate } from '@/core/format';
import { buildTaxReport, isInRange, type TaxReportRange } from '@/core/taxReport';
import type { AppData, Transaction } from '@/core/types';
import { L } from '@/i18n/labels';

const detailRows = (
  transactions: readonly Transaction[],
  partyLabel: string,
  totalLabel: string,
  paidLabel: string,
  debtLabel: string,
) =>
  transactions.flatMap((t) => {
    const { total, debt } = transactionTotals(t);
    return t.lines.map((line, i) => {
      const first = <T,>(value: T): T | '' => (i === 0 ? value : '');
      return {
        [L.colDate]: first(formatDate(t.date)),
        [partyLabel]: first(t.supplierName),
        [L.colProduct]: line.productName,
        [L.grossWeight]: line.grossWeight,
        [L.pricePerUnit]: line.pricePerUnit,
        [totalLabel]: first(total),
        [paidLabel]: first(t.amountPaid),
        [debtLabel]: first(debt),
      };
    });
  });

export const exportTaxReportXlsx = async (
  data: AppData,
  range: TaxReportRange,
  filename: string,
): Promise<void> => {
  const XLSX = await import('xlsx');
  const report = buildTaxReport(data, range);
  const inRange = data.transactions.filter((t) => isInRange(t.date, range));

  const summaryRows = [
    [L.taxPeriod, range.label],
    [L.taxTotalPurchase, report.totalPurchase],
    [L.taxTotalSale, report.totalSale],
    [L.taxGrossProfit, report.grossProfit],
    [L.taxPurchaseCount, report.purchaseCount],
    [L.taxSaleCount, report.saleCount],
    [L.note, report.disclaimer],
  ].map(([metric, value]) => ({ [L.taxMetric]: metric, [L.taxValue]: value }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), L.sheetSummary);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      detailRows(
        inRange.filter((t) => t.kind !== 'sale'),
        L.supplier,
        L.total,
        L.paid,
        L.remainingDebt,
      ),
    ),
    L.sheetPurchases,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      detailRows(
        inRange.filter((t) => t.kind === 'sale'),
        L.buyer,
        L.revenue,
        L.collected,
        L.remainingReceivable,
      ),
    ),
    L.sheetSales,
  );
  XLSX.writeFile(wb, filename);
};
