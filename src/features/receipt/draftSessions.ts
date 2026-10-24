/**
 * Thanh "Đang cân" khi một phiếu rời khỏi nó — chốt xong hay xoá đi đều như nhau: còn khách
 * đang cân thì mở khách kế, hết thì ra phiếu trắng.
 */

import { formatVnd } from '@mambo/core/format';
import type { DraftReceipt } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

/** Khách kế tiếp sau khi `leavingId` rời thanh; `undefined` = phiếu trắng. */
export const nextSession = (
  sessions: readonly DraftReceipt[],
  leavingId: string | undefined,
): string | undefined => sessions.find((d) => d.id !== leavingId)?.id;

/**
 * Link mở lại một nháp. Phải kèm loại phiếu: màn tạo phiếu đọc loại từ `?kind=`, thiếu thì coi là
 * phiếu mua — nháp phiếu bán mở ra thành phiếu mua và lần tự lưu kế tiếp ghi đè luôn loại phiếu.
 */
export const draftHref = (draft: Pick<DraftReceipt, 'id' | 'kind'>): string =>
  `${ROUTES.create}?kind=${draft.kind ?? 'purchase'}&draft=${draft.id}`;

/** Hậu quả nói bằng số (L3): ai, bao nhiêu tiền, rồi mới tới "mất hẳn". */
export const discardConsequence = (partyName: string, total: number): string =>
  `${partyName.trim() || L.walkIn} · ${formatVnd(total)}. ${L.discardDraftConsequence}`;
