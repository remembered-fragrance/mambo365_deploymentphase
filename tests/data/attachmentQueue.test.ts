import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@mambo/sdk';

const upload = vi.hoisted(() => vi.fn());
vi.mock('@/data/client', () => ({ apiForOrg: () => ({ attachments: { upload } }) }));

const { flushAttachments, putLocalAttachment, queueAttachmentUpload, deleteLocalAttachment } = await import(
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
    await queueAttachmentUpload('a', 'org-1');
    await queueAttachmentUpload('b', 'org-2');
    expect(await flushAttachments('org-1')).toBe(1);
    expect(upload).toHaveBeenCalledWith('a', photo);
    expect(await queued()).toEqual(['b']);
  });

  it('mất mạng: dừng, GIỮ ảnh trong hàng đợi để lần sau thử lại', async () => {
    upload.mockRejectedValue(new TypeError('Failed to fetch'));
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1');
    await flushAttachments('org-1');
    expect(await queued()).toEqual(['a']);
  });

  it('phiên hết hạn (UNAUTHENTICATED): cũng giữ, không bỏ ảnh', async () => {
    upload.mockRejectedValue(new ApiError('UNAUTHENTICATED', 401, 'x'));
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1');
    await flushAttachments('org-1');
    expect(await queued()).toEqual(['a']);
  });

  it('bị từ chối (sai loại / quá 3MB) hay không còn trong máy: bỏ khỏi hàng đợi, không kẹt ảnh sau', async () => {
    upload.mockRejectedValueOnce(new ApiError('VALIDATION_FAILED', 422, 'x')).mockResolvedValue(undefined);
    await putLocalAttachment('a', photo);
    await putLocalAttachment('c', photo);
    await queueAttachmentUpload('a', 'org-1');
    await queueAttachmentUpload('b', 'org-1'); // không có blob
    await queueAttachmentUpload('c', 'org-1');
    expect(await flushAttachments('org-1')).toBe(1);
    expect(await queued()).toEqual([]);
  });

  it('bỏ ảnh khỏi phiếu: xoá cả trong máy lẫn hàng đợi', async () => {
    await putLocalAttachment('a', photo);
    await queueAttachmentUpload('a', 'org-1');
    await deleteLocalAttachment('a');
    expect(await queued()).toEqual([]);
  });
});
