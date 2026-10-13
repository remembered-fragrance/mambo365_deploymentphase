/**
 * Kết nối giữa tổ chức và phần sổ bên kia cho mình xem (BE4 — Thumua365_BE docs/FRONTEND.md §5.6).
 *
 * Cần mạng: kết nối không nằm trong sổ offline. Lỗi đổi thành MỘT câu người dùng đọc được —
 * rẽ nhánh theo `code`, không theo `message` của máy chủ.
 */

import { LINK_CODE_ALPHABET, LINK_CODE_LENGTH, type LinkedBalanceItem, type LinkedReceiptsResult, type LinkSummary, type PartnerKind } from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { L } from '@/i18n/labels';
import { api } from './client';

/** Câu báo lỗi cho người dùng (kết nối, đơn, thông báo — mọi việc cần mạng). `notFound` là câu riêng của từng việc (mã sai, người chưa lên máy chủ…). */
export const linkErrorMessage = (err: unknown, notFound: string = L.linkFailed): string => {
  if (err instanceof TypeError) return L.linkOffline;
  if (!(err instanceof ApiError)) return L.linkFailed;
  switch (err.code) {
    case 'NOT_FOUND':
      return notFound;
    case 'VALIDATION_FAILED':
      return err.details && 'fields' in err.details ? L.linkCodeShape : L.linkFailed;
    case 'RATE_LIMITED':
      return L.linkRateLimited;
    case 'LINK_REQUIRED':
      return L.linkRequired;
    case 'ORDER_STATE_CHANGED':
      return L.orderChanged;
    case 'FORBIDDEN':
      return L.noAccessTitle;
    default:
      return err.requestId ? `${L.linkFailed} (id: ${err.requestId})` : L.linkFailed;
  }
};

const CODE_SHAPE = new RegExp(`^[${LINK_CODE_ALPHABET}]{${LINK_CODE_LENGTH}}$`);

/**
 * Lỗi khi nhập mã kết nối. Máy chủ báo sai hình dạng và "mã của chính sổ này" bằng cùng một lỗi
 * (`fields.code`) — không rẽ theo `message`: mã đúng hình dạng mà vẫn bị báo thì chỉ còn lý do thứ hai.
 */
export const claimErrorMessage = (err: unknown, code: string): string =>
  err instanceof ApiError && err.code === 'VALIDATION_FAILED' && CODE_SHAPE.test(code.toUpperCase().replace(/[\s-]/g, ''))
    ? L.linkCodeOwn
    : linkErrorMessage(err, L.linkCodeInvalid);

export const listLinks = async (): Promise<readonly LinkSummary[]> => (await api.links.list()).links;

export const claimLinkCode = (code: string): Promise<LinkSummary> => api.links.claim({ code });

export const inviteLink = (partnerKind: PartnerKind, partnerId: string): Promise<LinkSummary> =>
  api.links.invite({ partnerKind, partnerId });

export const revokeLink = (id: string): Promise<LinkSummary> => api.links.revoke(id);

export const linkedBalance = async (): Promise<readonly LinkedBalanceItem[]> => (await api.linked.balance()).items;

export const linkedReceipts = (orgId: string, cursor?: string): Promise<LinkedReceiptsResult> =>
  api.linked.receipts({ orgId, cursor });

/** `K7M2QX9P` → `K7M2-QX9P`: hai nhóm bốn ký tự, đọc qua điện thoại không nhầm. */
export const formatLinkCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;
