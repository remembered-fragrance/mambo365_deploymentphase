/**
 * Gói Pro Đợt 2 ở app: tên việc trong nhật ký (V6), nội dung chuyển khoản (V13), bảng kê thu mua (V12).
 */

import { describe, expect, it } from 'vitest';
import { emptyData } from '@mambo/core/normalize';
import { TAX_REPORT_DISCLAIMER } from '@mambo/core/taxReport';
import type { Transaction } from '@mambo/core/types';
import { purchaseLedgerSheet } from '@/export/purchaseLedgerXlsx';
import { auditActionText, auditDetail } from '@/features/org/AuditPage';
import { transferContent } from '@/features/shared/payMethod';
import { L } from '@/i18n/labels';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  date: '2026-10-10T03:00:00.000Z',
  supplierId: 's-1',
  supplierName: 'Anh Tư',
  lines: [{ id: 'l-1', productName: 'Cà phê', unit: 'kg', formulaType: 'standard', grossWeight: 100, pricePerUnit: 50_000 }],
  amountPaid: 0,
  kind: 'purchase',
  counterpartyId: 's-1',
  payments: [],
  ...over,
});

describe('nhật ký', () => {
  it('việc đã biết ra tiếng Việt; việc máy chủ mới thêm hiện tên thô, không vỡ', () => {
    expect(auditActionText('receipt.deleted')).toBe(L.auditActReceiptDeleted);
    expect(auditActionText('something.new')).toBe('something.new');
  });

  it('sửa phiếu đã chốt: chỉ nói phần đổi (ghi chú, số ảnh)', () => {
    const lines = auditDetail({
      action: 'receipt.updated',
      before: { note: null, photos: 1 },
      after: { note: 'Cân lại', photos: 1 },
    });
    expect(lines).toEqual([`${L.auditNote}: ${L.auditNoteEmpty} → "Cân lại"`]);
  });

  it('thay ảnh mà số ảnh giữ nguyên vẫn nói ra số ảnh cũ bị gỡ', () => {
    const lines = auditDetail({
      action: 'receipt.updated',
      before: { note: null, photos: 1 },
      after: { note: null, photos: 1, photosRemoved: 1 },
    });
    expect(lines).toEqual([`1 ${L.auditPhotosRemoved}`]);
  });

  it('ảnh chụp tự do bị hỏng (không phải object) thì không ném lỗi', () => {
    expect(() => auditDetail({ action: 'receipt.deleted', before: 'rác', after: null })).not.toThrow();
  });
});

describe('nội dung chuyển khoản', () => {
  it('PM- + 8 ký tự đầu id phiếu, viết hoa', () => {
    expect(transferContent('ab12cd34-1111-4111-8111-111111111111')).toBe('PM-AB12CD34');
  });
});

describe('bảng kê thu mua', () => {
  const range = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31, 23, 59, 59), label: 'Tháng 10/2026' };

  it('dòng đầu có câu tự chịu trách nhiệm; CCCD, địa chỉ để trống; tổng cộng đúng; phiếu bán không vào', () => {
    const data = {
      ...emptyData(),
      transactions: [
        tx({ payments: [{ id: 'p-1', date: '2026-10-10T03:00:00.000Z', amount: 5_000_000, method: 'transfer' }], amountPaid: 5_000_000 }),
        tx({ id: 'bbbbbbbb-1111-4111-8111-111111111111', kind: 'sale', supplierName: 'Công ty X' }),
      ],
    };
    const sheet = purchaseLedgerSheet(data, range);
    expect(sheet[1]).toEqual([TAX_REPORT_DISCLAIMER]);
    const body = sheet.slice(4, -1);
    expect(body).toHaveLength(1);
    const [index, , seller, address, idNumber, product, quantity, , unitPrice, amount, paidBy] = body[0] ?? [];
    expect([index, seller, address, idNumber, product, quantity, unitPrice, amount, paidBy]).toEqual([
      1,
      'Anh Tư',
      '',
      '',
      'Cà phê',
      100,
      50_000,
      5_000_000,
      L.paidByTransfer,
    ]);
    expect(sheet.at(-1)?.[9]).toBe(5_000_000);
  });
});
