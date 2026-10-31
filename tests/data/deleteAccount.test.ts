import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@mambo/sdk';
import { emptyData } from '@mambo/core/normalize';
import { L } from '@/i18n/labels';

const del = vi.hoisted(() => vi.fn());
vi.mock('@/data/client', () => ({ api: { account: { delete: del } }, apiForOrg: () => ({}), hasBackend: () => false }));

const { deleteAccount, wipeOrgFromDevice } = await import('@/data/account');
const { queueAttachmentUpload } = await import('@/data/attachments');
const { openLocalDb } = await import('@/data/localDb');
const { enqueue } = await import('@/data/queue');

const photo = new Blob(['x'], { type: 'image/jpeg' });

const seed = async (orgId: string, photoId: string) => {
  const db = await openLocalDb();
  const book = { ...emptyData(), drafts: [{ id: `d-${orgId}`, attachmentIds: [photoId] }] };
  await db.put('books', book, orgId);
  await db.put('attachments', photo, photoId);
  await enqueue({ entity: 'note', kind: 'insert', recordId: `n-${orgId}`, data: {}, orgId, userId: 'u-me' });
};

describe('dọn sổ một tổ chức trên máy dùng chung (B8)', () => {
  beforeEach(async () => {
    const db = await openLocalDb();
    for (const store of ['books', 'attachments', 'attachmentQueue', 'queue'] as const) await db.clear(store);
  });

  it('🔴 ảnh chưa gửi của người khác, hay chưa rõ người chụp, ở lại; ảnh của mình và ảnh đã lên máy chủ thì dọn', async () => {
    await seed('org-1', 'photo-in-book');
    const db = await openLocalDb();
    for (const id of ['mine', 'theirs', 'unknown']) await db.put('attachments', photo, id);
    await queueAttachmentUpload('mine', 'org-1', 'u-me');
    await queueAttachmentUpload('theirs', 'org-1', 'u-other');
    await db.put('attachmentQueue', 'org-1', 'unknown');

    await wipeOrgFromDevice('org-1', 'u-me');

    expect((await db.getAllKeys('attachments')).sort()).toEqual(['theirs', 'unknown']);
    expect((await db.getAllKeys('attachmentQueue')).sort()).toEqual(['theirs', 'unknown']);
  });
});

describe('xoá tài khoản', () => {
  beforeEach(async () => {
    del.mockReset();
    const db = await openLocalDb();
    for (const store of ['books', 'attachments', 'attachmentQueue', 'queue'] as const) await db.clear(store);
  });

  it('dọn sổ, hàng đợi, ảnh của tổ chức mình — sổ của người khác trên máy mượn còn nguyên', async () => {
    del.mockResolvedValue({ deletedOrganizations: 1, leftOrganizations: 0 });
    await seed('org-me', 'photo-me');
    await seed('org-other', 'photo-other');
    const db = await openLocalDb();
    await db.put('attachments', photo, 'queued-me');
    await db.put('attachmentQueue', 'org-me', 'queued-me');

    await deleteAccount(['org-me'], 'u-me');

    expect(await db.getAllKeys('books')).toEqual(['org-other']);
    expect((await db.getAllKeys('attachments')).sort()).toEqual(['photo-other']);
    expect(await db.getAllKeys('attachmentQueue')).toEqual([]);
    expect((await db.getAll('queue')).map((op) => op.orgId)).toEqual(['org-other']);
  });

  it('tổ chức còn nhân viên: báo "gỡ nhân viên trước", KHÔNG dọn gì trên máy', async () => {
    del.mockRejectedValue(new ApiError('VALIDATION_FAILED', 422, 'x', undefined, { reason: 'ORG_HAS_MEMBERS' }));
    await seed('org-me', 'photo-me');
    await expect(deleteAccount(['org-me'], 'u-me')).rejects.toThrow(L.deleteAccountHasMembers);
    expect(await (await openLocalDb()).getAllKeys('books')).toEqual(['org-me']);
  });

  it('còn làm thuê ở tổ chức khác: báo "nhờ chủ gỡ ra", KHÔNG dọn gì trên máy', async () => {
    del.mockRejectedValue(new ApiError('VALIDATION_FAILED', 422, 'x', undefined, { reason: 'STILL_MEMBER', organizations: [] }));
    await seed('org-me', 'photo-me');
    await expect(deleteAccount(['org-me'], 'u-me')).rejects.toThrow(L.deleteAccountStillMember);
    expect(await (await openLocalDb()).getAllKeys('books')).toEqual(['org-me']);
  });
});
