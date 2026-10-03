/**
 * Xuất một phiếu ra PDF / PNG rồi chia sẻ hoặc tải về.
 * `jspdf` chỉ nạp động — không nằm trong JS khởi tạo.
 */

import type { Transaction } from '@/core/types';
import { captureReceipt } from './receiptCapture';
import { shareOrDownload, type ShareResult } from './downloadFile';

const MARGIN_MM = 8;
const RECEIPT_TITLE = 'Phiếu THUMUA365';

const canvasToPdfBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let w = pageW - MARGIN_MM * 2;
  let h = (canvas.height * w) / canvas.width;
  if (h > pageH - MARGIN_MM * 2) {
    h = pageH - MARGIN_MM * 2;
    w = (canvas.width * h) / canvas.height;
  }
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, MARGIN_MM, w, h);
  return pdf.output('blob');
};

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh PNG'))),
      'image/png',
    );
  });

export const shareReceiptPdf = async (
  tx: Transaction,
  filename: string,
): Promise<ShareResult> => {
  const blob = await canvasToPdfBlob(await captureReceipt(tx));
  return shareOrDownload(blob, filename, RECEIPT_TITLE);
};

export const shareReceiptPng = async (
  tx: Transaction,
  filename: string,
): Promise<ShareResult> => {
  const blob = await canvasToPngBlob(await captureReceipt(tx));
  return shareOrDownload(blob, filename, RECEIPT_TITLE);
};
