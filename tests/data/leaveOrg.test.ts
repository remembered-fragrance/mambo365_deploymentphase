import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@mambo/sdk';
import { emptyData } from '@mambo/core/normalize';

const leave = vi.hoisted(() => vi.fn());
vi.mock('@/data/client', () => ({ api: { org: { leave } }, apiForOrg: () => ({}), hasBackend: () => false }));

const { leaveOrg } = await import('@/data/org');
const { openLocalDb } = await import('@/data/localDb');

describe('rời tổ chức', () => {
  beforeEach(async () => {
    leave.mockReset();
    await (await openLocalDb()).put('books', emptyData(), 'org-1');
  });

  it('máy chủ xác nhận rời → dọn sổ của tổ chức đó khỏi máy', async () => {
    leave.mockResolvedValue({});
    await leaveOrg('org-1');
    expect(await (await openLocalDb()).get('books', 'org-1')).toBeUndefined();
  });

  it('máy chủ từ chối (chủ không tự rời được) → sổ trên máy còn nguyên', async () => {
    leave.mockRejectedValue(new ApiError('FORBIDDEN', 403, 'x'));
    await expect(leaveOrg('org-1')).rejects.toBeInstanceOf(ApiError);
    expect(await (await openLocalDb()).get('books', 'org-1')).toBeDefined();
  });
});
