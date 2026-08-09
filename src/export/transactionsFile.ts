/**
 * Xuất danh sách giao dịch ra Excel / PDF.
 * `xlsx` và `jspdf` chỉ nạp động.
 */

import { lineTotals, transactionTotals } from '@/core/calc';
import { formatDate, formatQuantity, formatVnd } from '@/core/format';
import type { Transaction } from '@/core/types';
import { L } from '@/i18n/labels';
import { captureInIsolatedFrame } from './receiptCapture';
import { downloadBlob } from './downloadFile';

export const exportTransactionsXlsx = async (
  transactions: readonly Transaction[],
  filename: string,
): Promise<void> => {
  const XLSX = await import('xlsx');
  const rows = transactions.flatMap((t) => {
    const { total, debt } = transactionTotals(t);
    return t.lines.map((line, i) => {
      const lt = lineTotals(line);
      const first = <T,>(value: T): T | '' => (i === 0 ? value : '');
      return {
        [L.colKind]: first(t.kind === 'sale' ? L.sale : L.purchase),
        [L.colReceiptId]: first(t.id),
        [L.colDate]: first(formatDate(t.date)),
        [L.colParty]: first(t.supplierName),
        [L.colProduct]: line.productName,
        [L.grossWeight]: line.grossWeight,
        [L.colUnit]: line.unit,
        [L.tareWeight]: line.tareWeight ?? '',
        [L.qualityPercent]: line.qualityPercent ?? '',
        [L.qualityGrade]: line.qualityGrade ?? '',
        [L.netWeight]: lt.netWeight,
        [L.pricePerUnit]: line.pricePerUnit,
        [L.rawTotal]: lt.rawTotal,
        [L.lineTotal]: lt.total,
        [L.total]: first(total),
        [L.paid]: first(t.amountPaid),
        [L.remainingDebt]: first(debt),
        [L.note]: first(t.note ?? ''),
      };
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), L.sheetTransactions);
  XLSX.writeFile(wb, filename);
};

const CELL = 'padding:6px;border:1px solid #D6D0C4';

const listHtml = (transactions: readonly Transaction[]): string => {
  const totalSpent = transactions.reduce((s, t) => s + transactionTotals(t).total, 0);
  const totalWeight = transactions.reduce((s, t) => s + transactionTotals(t).netWeight, 0);
  const head = [L.colDate, L.colParty, L.colProduct, L.netWeight, L.total, L.colPayment]
    .map((h, i) => `<th style="text-align:${i > 2 ? 'right' : 'left'};${CELL}">${h}</th>`)
    .join('');
  const body = transactions
    .map((t) => {
      const { total, netWeight, debt } = transactionTotals(t);
      return `<tr>
        <td style="${CELL}">${formatDate(t.date)}</td>
        <td style="${CELL}">${t.supplierName}</td>
        <td style="${CELL}">${t.lines.map((l) => l.productName).join(', ')}</td>
        <td style="${CELL};text-align:right">${formatQuantity(netWeight)}</td>
        <td style="${CELL};text-align:right">${formatVnd(total)}</td>
        <td style="${CELL};text-align:right">${debt > 0 ? formatVnd(debt) : L.paidInFull}</td>
      </tr>`;
    })
    .join('');

  return `<h1 style="font-size:18px;margin:0 0 4px">THUMUA365 — ${L.history}</h1>
    <p style="margin:0 0 16px;color:#8B8175;font-size:12px">
      ${transactions.length} ${L.receiptCountUnit} · ${formatQuantity(totalWeight)} · ${formatVnd(totalSpent)}
    </p>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#EDEAE3">${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
};

export const exportTransactionsPdf = async (
  transactions: readonly Transaction[],
  filename: string,
): Promise<void> => {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:-10000px;top:0;width:900px;padding:24px;background:#FFFFFF;color:#1A1714;font-family:system-ui,sans-serif;font-size:11px';
  el.innerHTML = listHtml(transactions);

  const canvas = await captureInIsolatedFrame(el);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;
  const img = canvas.toDataURL('image/png');

  for (let y = 0; y < imgH; y += pageH) {
    if (y > 0) pdf.addPage();
    pdf.addImage(img, 'PNG', 0, -y, pageW, imgH);
  }
  downloadBlob(pdf.output('blob'), filename);
};
