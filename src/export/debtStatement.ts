/**
 * Sao kê công nợ của một đối tác (KE_HOACH_GOI_PRO V7) — ảnh / PDF sinh ở máy rồi chia sẻ qua Zalo, Messenger.
 * Cùng bộ dựng DOM, cùng màu với ảnh phiếu (`receiptCapture.ts`); số liệu lấy từ nhóm công nợ đang hiện.
 */

import { transactionTotals } from '@mambo/core/calc';
import type { DebtGroup, DebtSide } from '@mambo/core/debtSelectors';
import { formatDate, formatVnd } from '@mambo/core/format';
import { L } from '@/i18n/labels';
import { BRAND, CARD, INK, INK_2, INK_3, PAPER, PAYABLE, captureInIsolatedFrame, divider, el, row } from './receiptCapture';
import { canvasToPdfBlob, canvasToPngBlob } from './receiptFile';
import { shareOrDownload, type ShareResult } from './downloadFile';

export const buildStatementElement = (group: DebtGroup, side: DebtSide, now: Date): HTMLElement => {
  const unpaid = group.transactions.filter((t) => transactionTotals(t).debt > 0);
  const root = el(
    'div',
    `width:380px;background:${PAPER};color:${INK};font-family:system-ui,sans-serif;border-radius:16px;overflow:hidden;`,
  );

  const header = el('div', `background:${BRAND};color:${PAPER};padding:16px 20px;`);
  header.appendChild(
    el('p', 'margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;', [L.statementTitle]),
  );
  header.appendChild(el('p', 'margin:6px 0 0;font-size:18px;font-weight:800;', ['THUMUA365']));
  root.appendChild(header);

  const body = el('div', `padding:20px;background:${PAPER};`);
  body.appendChild(row(side === 'payable' ? L.supplier : L.buyer, group.partyName, true));
  body.appendChild(row(L.statementAsOf, formatDate(now.toISOString())));
  body.appendChild(divider());

  for (const tx of unpaid) {
    const { total, debt } = transactionTotals(tx);
    const line = el('div', `background:${CARD};border-radius:12px;padding:10px 12px;margin-bottom:8px;`);
    line.appendChild(
      el('div', `font-weight:600;color:${INK};font-size:13px;`, [`${L.statementReceipt} ${formatDate(tx.date)}`]),
    );
    line.appendChild(
      el('div', `color:${INK_3};font-size:12px;margin-top:4px;`, [`${L.statementReceiptTotal} ${formatVnd(total)}`]),
    );
    line.appendChild(
      el('div', `color:${PAYABLE};font-size:13px;font-weight:700;margin-top:2px;`, [
        `${L.statementRemaining} ${formatVnd(debt)}`,
      ]),
    );
    body.appendChild(line);
  }

  body.appendChild(divider());
  const totalRow = el('div', 'display:flex;justify-content:space-between;align-items:flex-end;margin:8px 0;gap:12px;');
  totalRow.appendChild(
    el('span', `color:${INK_2};font-weight:500;font-size:13px;`, [
      side === 'payable' ? L.statementPayableHeading : L.statementReceivableHeading,
    ]),
  );
  totalRow.appendChild(
    el('span', `color:${BRAND};font-size:24px;font-weight:800;text-align:right;`, [formatVnd(group.debt)]),
  );
  body.appendChild(totalRow);

  root.appendChild(body);
  return root;
};

const filename = (group: DebtGroup, now: Date, ext: string): string =>
  `sao-ke-cong-no-${now.toISOString().slice(0, 10)}-${group.partyId.slice(0, 8)}.${ext}`;

export const shareStatement = async (
  group: DebtGroup,
  side: DebtSide,
  format: 'png' | 'pdf',
  now = new Date(),
): Promise<ShareResult> => {
  const canvas = await captureInIsolatedFrame(buildStatementElement(group, side, now));
  const blob = format === 'pdf' ? await canvasToPdfBlob(canvas) : await canvasToPngBlob(canvas);
  return shareOrDownload(blob, filename(group, now, format), L.statementTitle);
};
