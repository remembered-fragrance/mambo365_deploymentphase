import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@mambo/sdk';

const upload = vi.hoisted(() => vi.fn());
vi.mock('@/data/client', () => ({ apiForOrg: () => ({ attachments: { upload } }) }));

const { flushAttachments, putLocalAttachment, queueAttachmentUpload, deleteLocalAttachment, MAX_PHOTO_TRIES } = await import(
  '@/data/attachments'
);
const { openLocalDb } = await import('@/data/localDb');

const queued = async () => (await openLocalDb()).getAllKeys('attachmentQueue');
const photo = new Blob(['x'], { type: 'image/jpeg' });

describe('hàng đợi ảnh chứng từ', () => {
  beforeEach(async () => {
    upload.mockReset();
    const db = await openLocalDb();
    await db.clear('attachmentQueue');
    await db.clear('attachments');
  });

  it('lên được thì rời hàng đợi; ảnh của tổ chức khác không đụng tới', async () => {
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    await queueAttachmentUpload('b', 'org-2', 'u-1');
    expect(await flushAttachments('org-1')).toEqual({ uploaded: 1, alerts: [] });
    expect(upload).toHaveBeenCalledWith('a', photo);
    expect(await queued()).toEqual(['b']);
  });

  it('mất mạng: dừng, GIỮ ảnh trong hàng đợi để lần sau thử lại', async () => {
    upload.mockRejectedValue(new TypeError('Failed to fetch'));
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    await flushAttachments('org-1');
    expect(await queued()).toEqual(['a']);
  });

  it('phiên hết hạn (UNAUTHENTICATED): cũng giữ, không bỏ ảnh', async () => {
    upload.mockRejectedValue(new ApiError('UNAUTHENTICATED', 401, 'x'));
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    await flushAttachments('org-1');
    expect(await queued()).toEqual(['a']);
  });

  it('bị từ chối (sai loại / quá 3MB) hay không còn trong máy: bỏ khỏi hàng đợi, không kẹt ảnh sau', async () => {
    upload.mockRejectedValueOnce(new ApiError('VALIDATION_FAILED', 422, 'x')).mockResolvedValue(undefined);
    await putLocalAttachment('a', photo);
    await putLocalAttachment('c', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    await queueAttachmentUpload('b', 'org-1', 'u-1'); // không có blob
    await queueAttachmentUpload('c', 'org-1', 'u-1');
    // Bị từ chối thì phải báo — ảnh chỉ còn trên máy này. Ảnh không còn trong máy thì không có gì để báo.
    expect(await flushAttachments('org-1')).toEqual({ uploaded: 1, alerts: [{ id: 'a', reason: 'rejected' }] });
    expect(await queued()).toEqual([]);
  });

  it('quá lớn (PAYLOAD_TOO_LARGE): cũng là lỗi của chính tấm ảnh — bỏ khỏi hàng đợi và báo', async () => {
    upload.mockRejectedValue(new ApiError('PAYLOAD_TOO_LARGE', 413, 'x'));
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    expect((await flushAttachments('org-1')).alerts).toEqual([{ id: 'a', reason: 'rejected' }]);
    expect(await queued()).toEqual([]);
  });

  it.each([
    ['RATE_LIMITED', 429],
    ['FORBIDDEN', 403],
    ['INTERNAL', 500],
  ] as const)('🔴 lỗi tạm %s: GIỮ ảnh trong hàng đợi (B6)', async (code, status) => {
    upload.mockRejectedValue(new ApiError(code, status, 'x'));
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    expect(await flushAttachments('org-1')).toEqual({ uploaded: 0, alerts: [] });
    expect(await queued()).toEqual(['a']);
  });

  it('lỗi tạm đủ số lần: báo người dùng MỘT lần, ảnh vẫn giữ và không chặn ảnh sau nữa', async () => {
    upload.mockImplementation((id: string) =>
      id === 'a' ? Promise.reject(new ApiError('FORBIDDEN', 403, 'x')) : Promise.resolve(undefined));
    await putLocalAttachment('a', photo);
    await putLocalAttachment('b', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    await queueAttachmentUpload('b', 'org-1', 'u-1');
    for (let i = 1; i < MAX_PHOTO_TRIES; i++) {
      expect(await flushAttachments('org-1')).toEqual({ uploaded: 0, alerts: [] });
    }
    expect(await flushAttachments('org-1')).toEqual({ uploaded: 1, alerts: [{ id: 'a', reason: 'stalled' }] });
    expect(await flushAttachments('org-1')).toEqual({ uploaded: 0, alerts: [] });
    expect(await queued()).toEqual(['a']);
    expect(upload).toHaveBeenLastCalledWith('a', photo);
  });

  it('đếm lần thử không làm mất người chụp', async () => {
    upload.mockRejectedValue(new ApiError('INTERNAL', 500, 'x'));
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    await flushAttachments('org-1');
    expect(await (await openLocalDb()).get('attachmentQueue', 'a')).toEqual({ orgId: 'org-1', userId: 'u-1', tries: 1 });
  });

  it('hàng đợi từ bản trước (giá trị là chuỗi orgId) vẫn đẩy được', async () => {
    const db = await openLocalDb();
    await putLocalAttachment('a', photo);
    await db.put('attachmentQueue', 'org-1', 'a');
    expect(await flushAttachments('org-1')).toEqual({ uploaded: 1, alerts: [] });
    expect(await queued()).toEqual([]);
  });

  it('bỏ ảnh khỏi phiếu: xoá cả trong máy lẫn hàng đợi', async () => {
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1', 'u-1');
    await deleteLocalAttachment('a');
    expect(await queued()).toEqual([]);
  });
});
