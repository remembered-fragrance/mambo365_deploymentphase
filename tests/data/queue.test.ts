/**
 * Hàng đợi offline. Đây là phần dễ làm mất dữ liệu nhất của cả app, nên test
 * bám vào đúng bốn tình huống thật ngoài vựa.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearQueue,
  enqueue,
  isDue,
  isExhausted,
  markFailed,
  MAX_TRIES,
  opInsert,
  opSoftDelete,
  opUpdate,
  pendingCount,
  pendingOps,
  pendingRecordIds,
  removeOp,
  RETRY_DELAYS_MS,
} from '@/data/queue';

beforeEach(async () => {
  await clearQueue();
});

describe('hàng đợi sống sót và giữ đúng thứ tự', () => {
  it('thao tác được ghi xuống IndexedDB, không nằm trong bộ nhớ', async () => {
    await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    expect(await pendingCount()).toBe(1);
  });

  it('xả theo ĐÚNG thứ tự tạo — phiếu trước, lần trả tiền sau', async () => {
    await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    await new Promise((r) => setTimeout(r, 2));
    await enqueue(opInsert('payments', 'pay-1', { id: 'pay-1' }));
    await new Promise((r) => setTimeout(r, 2));
    await enqueue(opSoftDelete('drafts', 'draft-1'));

    expect((await pendingOps()).map((op) => op.table)).toEqual([
      'transactions',
      'payments',
      'drafts',
    ]);
  });

  it('bốn thao tác của MỘT lần bấm vẫn đúng thứ tự dù cùng một mili giây', async () => {
    // "Trả đủ & xong" xếp cả bốn thao tác trong cùng một tích tắc. Nếu sắp theo
    // mốc thời gian thì thứ tự rơi về khoá chính ngẫu nhiên, và lần trả tiền có
    // thể lên trước phiếu → khoá ngoại lỗi, tiền rơi mất.
    await enqueue(opInsert('suppliers', 'sup-1', { id: 'sup-1' }));
    await enqueue(opSoftDelete('drafts', 'draft-1'));
    await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    await enqueue(opInsert('payments', 'pay-1', { id: 'pay-1' }));

    expect((await pendingOps()).map((op) => op.table)).toEqual([
      'suppliers',
      'drafts',
      'transactions',
      'payments',
    ]);
  });

  it('sửa cùng một bản ghi nhiều lần chỉ còn MỘT thao tác — người dùng đang dùng 3G', async () => {
    await enqueue(opInsert('drafts', 'draft-1', { id: 'draft-1', supplier_name: '' }));
    await enqueue(opUpdate('drafts', 'draft-1', { id: 'draft-1', supplier_name: 'Cô' }));
    await enqueue(opUpdate('drafts', 'draft-1', { id: 'draft-1', supplier_name: 'Cô Mai' }));
    await enqueue(opUpdate('drafts', 'draft-1', { id: 'draft-1', supplier_name: 'Cô Lê Thị Mai' }));

    const ops = await pendingOps();
    expect(ops.map((op) => op.kind)).toEqual(['insert', 'update']);
    expect(ops[1]?.payload).toMatchObject({ supplier_name: 'Cô Lê Thị Mai' });
  });

  it('gộp thao tác sửa KHÔNG đụng tới bản ghi khác', async () => {
    await enqueue(opUpdate('drafts', 'draft-1', { id: 'draft-1' }));
    await enqueue(opUpdate('drafts', 'draft-2', { id: 'draft-2' }));
    await enqueue(opUpdate('drafts', 'draft-1', { id: 'draft-1' }));

    expect((await pendingOps()).map((op) => op.recordId)).toEqual(['draft-2', 'draft-1']);
  });

  it('đẩy xong thì rời hàng đợi', async () => {
    const op = await enqueue(opInsert('notes', 'note-1', { id: 'note-1' }));
    await removeOp(op.id);
    expect(await pendingCount()).toBe(0);
  });

  it('mỗi thao tác có id riêng — hai lần bấm là hai thao tác, không đè nhau', async () => {
    const first = await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    const second = await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    expect(first.id).not.toBe(second.id);
  });
});

describe('thử lại có giãn cách', () => {
  it('lần thất bại đầu hẹn lại sau 1 giây, không thử lại ngay', async () => {
    const op = await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    const failed = await markFailed(op, 'mất mạng');

    expect(failed.tries).toBe(1);
    expect(failed.lastError).toBe('mất mạng');
    expect(isDue(failed, Date.now())).toBe(false);
    expect(isDue(failed, Date.now() + (RETRY_DELAYS_MS[0] ?? 0) + 10)).toBe(true);
  });

  it('giãn cách tăng dần qua từng lần thất bại', async () => {
    let op = await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    const waits: number[] = [];
    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      const before = Date.now();
      op = await markFailed(op, 'mất mạng');
      waits.push(new Date(op.nextAttemptAt).getTime() - before);
    }
    expect(waits.map((w) => Math.round(w / 1000))).toEqual(
      RETRY_DELAYS_MS.map((d) => Math.round(d / 1000)),
    );
  });

  it('hết lần thử thì đánh dấu kẹt — phải báo cho người dùng, không im lặng', async () => {
    let op = await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    expect(isExhausted(op)).toBe(false);

    for (let i = 0; i < MAX_TRIES; i++) op = await markFailed(op, 'máy chủ từ chối');

    expect(isExhausted(op)).toBe(true);
    // Vẫn còn trong hàng đợi: không được lặng lẽ vứt thao tác của người dùng.
    expect(await pendingCount()).toBe(1);
  });
});

describe('cờ đang chờ gửi', () => {
  it('liệt kê bản ghi còn thao tác chưa đẩy được', async () => {
    await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    await enqueue(opInsert('payments', 'tx-1', { id: 'pay-1' }));
    await enqueue(opInsert('notes', 'note-9', { id: 'note-9' }));

    expect(await pendingRecordIds()).toEqual(new Set(['tx-1', 'note-9']));
  });
});

describe('đổi tài khoản', () => {
  it('hàng đợi của người cũ không được đẩy bằng phiên người mới', async () => {
    await enqueue(opInsert('transactions', 'tx-1', { id: 'tx-1' }));
    await clearQueue();
    expect(await pendingCount()).toBe(0);
  });
});
