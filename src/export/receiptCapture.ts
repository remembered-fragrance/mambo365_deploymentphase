/**
 * Dựng DOM phiếu để chụp thành ảnh.
 *
 * Chỉ dùng hex nội tuyến — html2canvas không đọc được biến CSS/`oklch` của
 * Tailwind, nên đây là ngoại lệ có chủ đích với luật "không hardcode màu".
 * Giá trị hex bám theo bảng token "Sổ Vựa" trong `src/index.css`.
 */

import { lineTotals, transactionTotals } from '@/core/calc';
import { formatDateTime, formatQuantity, formatVnd } from '@/core/format';
import { cropMeta } from '@/core/catalog';
import type { CropType, Transaction } from '@/core/types';
import { L } from '@/i18n/labels';

const INK = '#1A1714';
const INK_2 = '#554E44';
const INK_3 = '#8B8175';
const RULE = '#D6D0C4';
const BRAND = '#14663C';
const CARD = '#FBF9F5';
const PAPER = '#FFFFFF';
const PAYABLE = '#9A3412';

const el = (tag: string, style: string, children: (Node | string)[] = []): HTMLElement => {
  const node = document.createElement(tag);
  node.setAttribute('style', style);
  for (const child of children) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
};

const row = (label: string, value: string, strong = false): HTMLElement =>
  el(
    'div',
    'display:flex;justify-content:space-between;align-items:center;font-size:13px;margin:4px 0;gap:12px;',
    [
      el('span', `color:${INK_3};`, [label]),
      el(
        'span',
        strong
          ? `color:${INK};font-weight:600;text-align:right;`
          : `color:${INK_2};text-align:right;`,
        [value],
      ),
    ],
  );

const divider = (): HTMLElement => el('div', `border-top:1px dashed ${RULE};margin:12px 0;`);

const productLabel = (name: string, crop?: CropType): string =>
  `${cropMeta(crop)?.emoji ?? ''} ${name}`.trim();

const lineBlock = (
  line: Transaction['lines'][number],
  index: number,
  showIndex: boolean,
): HTMLElement => {
  const lt = lineTotals(line);
  const block = el('div', `background:${CARD};border-radius:12px;padding:12px;margin-bottom:8px;`);
  block.appendChild(
    el('div', `font-weight:600;color:${INK};font-size:13px;margin-bottom:8px;`, [
      productLabel(line.productName, line.crop) + (showIndex ? ` #${index + 1}` : ''),
    ]),
  );
  block.appendChild(row(L.grossWeight, formatQuantity(line.grossWeight, line.unit)));
  if (line.formulaType === 'netAfterTare') {
    block.appendChild(row(L.tareWeight, formatQuantity(line.tareWeight ?? 0, line.unit)));
  }
  if (line.formulaType === 'rubberLatex') {
    block.appendChild(row(L.qualityPercent, `${line.qualityPercent ?? 0}%`));
  }
  if (line.qualityGrade) block.appendChild(row(L.qualityGrade, line.qualityGrade));
  block.appendChild(row(L.netWeight, formatQuantity(lt.netWeight, line.unit)));
  block.appendChild(row(L.pricePerUnit, `${formatVnd(line.pricePerUnit)}/${line.unit}`));
  block.appendChild(row(L.rawTotal, formatVnd(lt.rawTotal)));
  block.appendChild(row(L.lineTotal, formatVnd(lt.total), true));
  return block;
};

export const buildReceiptExportElement = (tx: Transaction): HTMLElement => {
  const { netWeight, total, debt } = transactionTotals(tx);
  const isSale = tx.kind === 'sale';

  const root = el(
    'div',
    `width:380px;background:${PAPER};color:${INK};font-family:system-ui,sans-serif;border-radius:16px;overflow:hidden;`,
  );

  const header = el('div', `background:${BRAND};color:${PAPER};padding:16px 20px;`);
  header.appendChild(
    el('p', 'margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;', [
      isSale ? L.saleReceipt : L.purchaseReceipt,
    ]),
  );
  header.appendChild(
    el('p', 'margin:6px 0 0;font-size:18px;font-weight:800;', ['THUMUA365']),
  );
  root.appendChild(header);

  const body = el('div', `padding:20px;background:${PAPER};`);
  body.appendChild(row(isSale ? L.buyer : L.supplier, tx.supplierName, true));
  body.appendChild(row(L.time, formatDateTime(tx.date)));
  if (tx.note) body.appendChild(row(L.note, tx.note));
  body.appendChild(divider());

  tx.lines.forEach((line, i) => body.appendChild(lineBlock(line, i, tx.lines.length > 1)));

  body.appendChild(divider());
  body.appendChild(row(L.totalNetWeight, formatQuantity(netWeight)));

  const totalRow = el(
    'div',
    'display:flex;justify-content:space-between;align-items:flex-end;margin:8px 0;gap:12px;',
  );
  totalRow.appendChild(el('span', `color:${INK_2};font-weight:500;font-size:13px;`, [L.total]));
  totalRow.appendChild(
    el('span', `color:${BRAND};font-size:24px;font-weight:800;text-align:right;`, [
      formatVnd(total),
    ]),
  );
  body.appendChild(totalRow);
  body.appendChild(row(isSale ? L.collected : L.paid, formatVnd(tx.amountPaid)));

  if (debt > 0) {
    const debtBox = el(
      'div',
      `display:flex;justify-content:space-between;align-items:center;background:${CARD};border-radius:8px;padding:8px 12px;margin-top:8px;`,
    );
    debtBox.appendChild(
      el('span', `color:${PAYABLE};font-weight:500;font-size:13px;`, [
        isSale ? L.remainingReceivable : L.remainingDebt,
      ]),
    );
    debtBox.appendChild(
      el('span', `color:${PAYABLE};font-weight:700;font-size:13px;`, [formatVnd(debt)]),
    );
    body.appendChild(debtBox);
  }

  root.appendChild(body);
  return root;
};

/** Chụp trong iframe trống — html2canvas không đọc được stylesheet Tailwind. */
export const captureInIsolatedFrame = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  const { default: html2canvas } = await import('html2canvas');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:420px;height:2000px;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    document.body.removeChild(iframe);
    throw new Error('Không tạo được khung xuất phiếu');
  }

  idoc.open();
  idoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:8px;background:${PAPER};"></body></html>`,
  );
  idoc.close();
  idoc.body.appendChild(element);

  try {
    return await html2canvas(element, {
      scale: 2,
      backgroundColor: PAPER,
      useCORS: true,
      logging: false,
      windowWidth: 420,
    });
  } finally {
    document.body.removeChild(iframe);
  }
};

export const captureReceipt = async (tx: Transaction): Promise<HTMLCanvasElement> =>
  captureInIsolatedFrame(buildReceiptExportElement(tx));
