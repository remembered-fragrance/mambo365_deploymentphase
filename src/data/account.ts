/**
 * Xoá tài khoản THẬT (BE6 — Thumua365_BE docs/FRONTEND.md §5.10): máy chủ xoá ảnh, sổ, đơn, kết nối
 * của tổ chức mình là chủ duy nhất, hồ sơ, rồi tài khoản đăng nhập. Người còn làm thuê ở tổ chức nào thì
 * bị chặn (`STILL_MEMBER`) — chủ gỡ ra trước.
 *
 * Xong thì dọn dấu vết trên máy — máy có thể là máy mượn. Chỉ dọn các tổ chức của NGƯỜI NÀY:
 * máy dùng chung có thể còn sổ chưa đồng bộ của người khác.
 */

import type { AccountDeleteResult } from '@mambo/contracts';
import type { AppData } from '@mambo/core/types';
import { ApiError } from '@mambo/sdk';
import { L } from '@/i18n/labels';
import { deleteLocalAttachment } from './attachments';
import { clearOrgCache } from './cache';
import { api } from './client';
import { linkErrorMessage } from './links';
import { openLocalDb } from './localDb';
import { pendingOps } from './queue';
import { track } from './track';

/** Bỏ sổ, hàng đợi op, ảnh (của sổ và đang chờ đẩy) của một tổ chức khỏi máy. */
export const wipeOrgFromDevice = async (orgId: string): Promise<void> => {
  const db = await openLocalDb();
  const book = (await db.get('books', orgId)) as AppData | undefined;
  const photos = [...(book?.transactions ?? []), ...(book?.drafts ?? [])].flatMap((r) => r.attachmentIds ?? []);
  for (const queued of await db.getAllKeys('attachmentQueue')) {
    if ((await db.get('attachmentQueue', queued)) === orgId) photos.push(queued);
  }
  for (const id of photos) await deleteLocalAttachment(id);
  for (const op of await pendingOps(orgId)) await db.delete('queue', op.id);
  await clearOrgCache(orgId);
};

export const deleteAccount = async (orgIds: readonly string[]): Promise<AccountDeleteResult> => {
  let result: AccountDeleteResult;
  try {
    result = await api.account.delete();
  } catch (err) {
    if (err instanceof ApiError && err.details?.reason === 'ORG_HAS_MEMBERS') throw new Error(L.deleteAccountHasMembers, { cause: err });
    // BE 0.13.0: người làm không tự rời được, nên còn làm thuê ở đâu thì chưa xoá được tài khoản.
    if (err instanceof ApiError && err.details?.reason === 'STILL_MEMBER') throw new Error(L.deleteAccountStillMember, { cause: err });
    throw new Error(linkErrorMessage(err), { cause: err });
  }
  track('account_deleted', {});
  for (const orgId of orgIds) await wipeOrgFromDevice(orgId);
  return result;
};
