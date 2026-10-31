/**
 * Xuất báo cáo tổng của doanh nghiệp ra Excel (KE_HOACH_GOI_PRO D5). Số do máy chủ tính (`/reports/summary`);
 * file này chỉ xếp thành bảng: mỗi chi nhánh một dòng, dòng cuối là cả doanh nghiệp.
 */

import type { ReportFigures, ReportSummary } from '@mambo/contracts';
import { L } from '@/i18n/labels';

const HEADER = [
  L.reportBranch,
  `${L.reportBought} — ${L.reportCount}`,
  `${L.reportBought} — ${L.reportWeight}`,
  `${L.reportBought} — ${L.reportAmount}`,
  `${L.reportBought} — ${L.paid}`,
  `${L.reportBought} — ${L.reportDebt}`,
  `${L.reportSold} — ${L.reportCount}`,
  `${L.reportSold} — ${L.reportWeight}`,
  `${L.reportSold} — ${L.reportAmount}`,
  `${L.reportSold} — ${L.paid}`,
  `${L.reportSold} — ${L.reportDebt}`,
];

const row = (name: string, f: ReportFigures): (string | number)[] => [
  name,
  ...[f.purchase, f.sale].flatMap((s) => [s.count, s.netWeight, s.amount, s.paid, s.debt]),
];

export const orgReportSheet = (report: ReportSummary, title: string): (string | number)[][] => [
  [title],
  [],
  HEADER,
  ...report.branches.map((b) => row(b.branch?.name ?? L.reportNoBranch, b.figures)),
  row(L.reportAllBranches, report.totals),
];

export const exportOrgReportXlsx = async (report: ReportSummary, title: string, filename: string): Promise<void> => {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(orgReportSheet(report, title));
  sheet['!cols'] = [24, ...Array.from({ length: 10 }, () => 16)].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, L.sheetSummary);
  XLSX.writeFile(wb, filename);
};
