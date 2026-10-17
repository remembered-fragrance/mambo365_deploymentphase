import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@mambo/sdk';
import { emptyData } from '@mambo/core/normalize';
import { L } from '@/i18n/labels';

const del = vi.hoisted(() => vi.fn());
vi.mock('@/data/client', () => ({ api: { account: { delete: del } }, apiForOrg: () => ({}), hasBackend: () => false }));

const { deleteAccount } = await import('@/data/account');
const { openLocalDb } = await import('@/data/localDb');
const { enqueue } = await import('@/data/queue');

const photo = new Blob(['x'], { type: 'image/jpeg' });

const seed = async (orgId: string, photoId: string) => {
  const db = await openLocalDb();
  const book = { ...emptyData(), drafts: [{ id: `d-${orgId}`, attachmentIds: [photoId] }] };
  await db.put('books', book, orgId);
  await db.put('attachments', photo, photoId);
  await enqueue({ entity: 'note', kind: 'insert', recordId: `n-${orgId}`, data: {}, orgId } as never);
};

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

    await deleteAccount(['org-me']);

    expect(await db.getAllKeys('books')).toEqual(['org-other']);
    expect((await db.getAllKeys('attachments')).sort()).toEqual(['photo-other']);
    expect(await db.getAllKeys('attachmentQueue')).toEqual([]);
    expect((await db.getAll('queue')).map((op) => op.orgId)).toEqual(['org-other']);
  });

  it('tổ chức còn nhân viên: báo "gỡ nhân viên trước", KHÔNG dọn gì trên máy', async () => {
    del.mockRejectedValue(new ApiError('VALIDATION_FAILED', 422, 'x', undefined, { reason: 'ORG_HAS_MEMBERS' }));
    await seed('org-me', 'photo-me');
    await expect(deleteAccount(['org-me'])).rejects.toThrow(L.deleteAccountHasMembers);
    expect(await (await openLocalDb()).getAllKeys('books')).toEqual(['org-me']);
  });

  it('còn làm thuê ở tổ chức khác: báo "nhờ chủ gỡ ra", KHÔNG dọn gì trên máy', async () => {
    del.mockRejectedValue(new ApiError('VALIDATION_FAILED', 422, 'x', undefined, { reason: 'STILL_MEMBER', organizations: [] }));
    await seed('org-me', 'photo-me');
    await expect(deleteAccount(['org-me'])).rejects.toThrow(L.deleteAccountStillMember);
    expect(await (await openLocalDb()).getAllKeys('books')).toEqual(['org-me']);
  });
});
