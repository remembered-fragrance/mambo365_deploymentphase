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
import { wipeOrgPhotos } from './attachments';
import { clearOrgCache } from './cache';
import { api } from './client';
import { linkErrorMessage } from './links';
import { openLocalDb } from './localDb';
import { peekDeviceAccount } from './deviceAccount';
import { usersWithBooks, knownBooks } from './knownBooks';
import { orgsInCachedMe } from './meCache';
import { hasOpsFor, removeOpsOf } from './queue';
import { forgetRescued, hasRescued } from './rescue';
import { track } from './track';

/**
 * Bỏ sổ, op chưa gửi của `userId`, ảnh (của sổ và đang chờ đẩy) của một tổ chức khỏi máy. Op và ảnh chưa gửi của
 * người khác cùng tổ chức (máy dùng chung) giữ lại: đó là phiếu của họ, chỉ họ gửi hoặc bỏ được (`wipeOrgPhotos`).
 * `orgGone`: tổ chức đã xoá trên máy chủ (xoá tài khoản) — ảnh nào cũng không còn chỗ để lên.
 */
export const wipeOrgFromDevice = async (
  orgId: string,
  userId: string | null,
  options: { readonly orgGone?: boolean } = {},
): Promise<void> => {
  const db = await openLocalDb();
  const book = (await db.get('books', orgId)) as AppData | undefined;
  const photos = [...(book?.transactions ?? []), ...(book?.drafts ?? [])].flatMap((r) => r.attachmentIds ?? []);
  await wipeOrgPhotos(orgId, userId, photos, options.orgGone);
  if (userId) await removeOpsOf(orgId, userId);
  await clearOrgCache(orgId);
  forgetRescued(orgId);
};

/**
 * Sổ trên máy mà còn tài khoản nhận: tổ chức trong `knownBooks` và trong bản `/v1/me` đã lưu của MỌI tài khoản
 * từng đăng nhập máy này, cộng sổ của tài khoản máy. `null`: không đọc hết được — không được dọn gì.
 */
const claimedBookKeys = (): Set<string> | null => {
  try {
    const { users, orgIds } = orgsInCachedMe();
    const keys = new Set([...users, ...orgIds]);
    for (const userId of usersWithBooks()) {
      keys.add(userId);
      for (const book of knownBooks(userId)) keys.add(book.id);
    }
    const device = peekDeviceAccount();
    if (device) keys.add(device.id);
    return keys;
  } catch {
    return null;
  }
};

/**
 * Dọn sổ mồ côi (B8, phần sót từ trước 0.20): sổ của tổ chức đã gỡ người dùng từ trước khi app biết nhớ
 * `knownBooks` — `/v1/me` không kể, danh sách sổ không có, nên cả đăng xuất cũng không dọn; phiếu, công nợ, SĐT
 * đối tác nằm lại trên máy mãi. Chỉ dọn sổ KHÔNG ai nhận (xem `claimedBookKeys`, gồm cả `current`) và không còn
 * gì chưa gửi — op của bất kỳ ai, phần cất tạm (B7); ảnh chưa gửi `wipeOrgPhotos` giữ lại. Thứ bị dọn đều đã nằm
 * trên máy chủ, ai còn quyền mở lại thì kéo về.
 */
export const sweepOrphanBooks = async (current: readonly string[]): Promise<string[]> => {
  const claimed = claimedBookKeys();
  if (!claimed) return [];
  for (const key of current) claimed.add(key);
  const db = await openLocalDb();
  const swept: string[] = [];
  for (const key of await db.getAllKeys('books')) {
    if (claimed.has(key) || hasRescued(key) || (await hasOpsFor(key))) continue;
    await wipeOrgFromDevice(key, null);
    swept.push(key);
  }
  return swept;
};

export const deleteAccount = async (orgIds: readonly string[], userId: string): Promise<AccountDeleteResult> => {
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
  for (const orgId of orgIds) await wipeOrgFromDevice(orgId, userId, { orgGone: true });
  return result;
};
