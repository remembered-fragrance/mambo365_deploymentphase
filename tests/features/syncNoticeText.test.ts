/**
 * Toast chỉ hiện một câu mỗi lúc — mọi thông báo của một lượt đồng bộ phải nằm trong MỘT câu,
 * và câu đó phải chỉ đúng phiếu nào để người cân xem lại.
 */

import { describe, expect, it } from 'vitest';
import { formatDate, formatVnd } from '@mambo/core/format';
import { emptyData } from '@mambo/core/normalize';
import type { AppData, Transaction } from '@mambo/core/types';
import { droppedLines, syncNoticeMessage, type SyncNoticeItem } from '@/features/shared/syncNoticeText';
import { L } from '@/i18n/labels';

const receipt: Transaction = {
  id: 'tx-1',
  date: '2026-10-19T03:00:00.000Z',
  supplierId: 's-1',
  supplierName: 'Chú Bảy',
  lines: [],
  amountPaid: 0,
  kind: 'purchase',
  counterpartyId: 's-1',
  payments: [],
};

const data: AppData = { ...emptyData(), transactions: [receipt] };

const notice = (over: Partial<SyncNoticeItem>): SyncNoticeItem => ({
  code: 'RECORD_DELETED',
  entity: 'transaction',
  kind: 'update',
  recordId: 'tx-1',
  ...over,
});

describe('syncNoticeMessage', () => {
  it('không có gì thì không báo', () => {
    expect(syncNoticeMessage(0, [], data)).toBeNull();
  });

  it('gộp thao tác bị bỏ và cảnh báo vào một câu', () => {
    const text = syncNoticeMessage(3, [notice({ code: 'ORDER_NOT_OPEN', kind: 'insert' })], data);
    expect(text).toContain(`3 ${L.branchOpsDropped}`);
    expect(text).toContain('Phiếu Chú Bảy');
    expect(text).toContain(L.syncOrderNotOpen);
  });

  it('lần trả nói số tiền và phiếu, và nói rõ tiền đã lưu', () => {
    const text = syncNoticeMessage(
      0,
      [notice({ entity: 'payment', kind: 'insert', recordId: 'pay-1', transactionId: 'tx-1', amount: 500_000 })],
      data,
    );
    expect(text).toMatch(/500\.000/);
    expect(text).toContain(`${L.syncNoticeForReceipt} Chú Bảy`);
    expect(text).toContain(L.syncPaymentOnDeleted);
  });

  it('phiếu đã mất khỏi sổ thì vẫn báo, không vỡ', () => {
    const text = syncNoticeMessage(0, [notice({ recordId: 'tx-gone' })], data);
    expect(text).toBe(`${L.syncNoticeReceipt} ${L.syncRecordDeleted}`);
  });

  it('nhiều cảnh báo thì kể hai cái đầu, còn lại đếm', () => {
    const four = ['tx-1', 'tx-2', 'tx-3', 'tx-4'].map((recordId) => notice({ recordId }));
    const text = syncNoticeMessage(0, four, data);
    expect(text?.split(' · ')).toHaveLength(3);
    expect(text).toContain(`+2 ${L.syncNoticesMore}`);
  });

  // Chạy thử 19/10: chốt phiếu theo đơn khi mất mạng, bên kia huỷ đơn. Nháp (thêm + sửa) và phiếu đều nhận
  // ORDER_NOT_OPEN — toast kể hai lần "Phiếu nháp" không tên, còn phiếu 26 triệu thì chìm vào "+1".
  it('phiếu đã chốt lên trước; nháp đã chốt (không còn trong sổ) không kể; cùng bản ghi chỉ kể một lần', () => {
    const notOpen = { code: 'ORDER_NOT_OPEN' as const };
    const text = syncNoticeMessage(
      0,
      [
        notice({ ...notOpen, entity: 'draft', kind: 'insert', recordId: 'draft-gone' }),
        notice({ ...notOpen, entity: 'draft', kind: 'update', recordId: 'draft-gone' }),
        notice({ ...notOpen, entity: 'transaction', kind: 'insert', recordId: 'tx-1' }),
        notice({ ...notOpen, entity: 'transaction', kind: 'update', recordId: 'tx-1' }),
      ],
      data,
    );
    expect(text).toBe(`${L.syncNoticeReceipt} Chú Bảy, ${formatDate(receipt.date)} ${L.syncOrderNotOpen}`);
  });

  it('nháp còn trong sổ thì vẫn báo, sau phiếu', () => {
    const withDraft: AppData = {
      ...data,
      drafts: [{ id: 'd-1', status: 'draft', supplierName: 'Cô Mai', lines: [], amountPaid: 0, createdAt: receipt.date, updatedAt: receipt.date }],
    };
    const text = syncNoticeMessage(
      0,
      [notice({ code: 'ORDER_NOT_OPEN', entity: 'draft', recordId: 'd-1' }), notice({ code: 'ORDER_NOT_OPEN' })],
      withDraft,
    );
    expect(text?.split(' · ')[0]).toContain('Chú Bảy');
    expect(text?.split(' · ')[1]).toContain(`${L.syncNoticeDraft} Cô Mai`);
  });
});


describe('thẻ "đã bỏ vì đổi chi nhánh" (B10)', () => {
  it('🔴 kể từng phiếu, lần trả: người, ngày, số tiền; danh bạ gộp một dòng đếm', () => {
    const lines = droppedLines([
      { entity: 'transaction', kind: 'insert', recordId: 'tx-1', name: 'Chú Bảy', date: receipt.date, amount: 1_000_000 },
      { entity: 'payment', kind: 'insert', recordId: 'p-1', name: 'Chú Bảy', date: receipt.date, amount: 300_000 },
      { entity: 'transaction', kind: 'softDelete', recordId: 'tx-2', name: '', date: receipt.date },
      { entity: 'supplier', kind: 'update', recordId: 's-1' },
      { entity: 'product', kind: 'insert', recordId: 'pr-1' },
    ]);
    expect(lines).toEqual([
      `${L.syncNoticeReceipt} Chú Bảy, ${formatDate(receipt.date)}, ${formatVnd(1_000_000)}`,
      `${L.syncNoticePayment} ${formatVnd(300_000)} ${L.syncNoticeForReceipt} Chú Bảy, ${formatDate(receipt.date)}`,
      `${L.droppedDelete} ${L.syncNoticeReceipt} ${L.walkIn}, ${formatDate(receipt.date)}`,
      `2 ${L.droppedOthers}`,
    ]);
  });
});

describe('ảnh chứng từ (B6)', () => {
  it('ảnh bị từ chối nói rõ của phiếu nào; ảnh thử mãi không lên nói là vẫn còn trên máy', () => {
    const withPhoto: AppData = { ...data, transactions: [{ ...receipt, attachmentIds: ['ph-1', 'ph-2'] }] };
    const text = syncNoticeMessage(0, [], withPhoto, [
      { id: 'ph-1', reason: 'rejected' },
      { id: 'ph-2', reason: 'stalled' },
    ]);
    expect(text).toBe(
      `1 ${L.photoRejected} (${L.syncNoticeReceipt} Chú Bảy, ${formatDate(receipt.date)}) · ` +
        `1 ${L.photoStalled} (${L.syncNoticeReceipt} Chú Bảy, ${formatDate(receipt.date)})`,
    );
  });
});
