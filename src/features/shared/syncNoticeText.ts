/**
 * Câu báo sau một lượt đồng bộ: thao tác tự bỏ vì đổi chi nhánh, và các op máy chủ đã nhận kèm cảnh báo.
 * Toast chỉ hiện MỘT câu mỗi lúc (câu sau đè câu trước) — nên mọi thứ của một lượt gộp vào một câu.
 */

import { formatDate, formatVnd } from '@mambo/core/format';
import type { AppData, Transaction } from '@mambo/core/types';
import type { StoreValue } from '@/data/useStore';
import { L } from '@/i18n/labels';

export type SyncNoticeItem = StoreValue['syncWarnings'][number];
export type DroppedItem = StoreValue['branchDropped'][number];
export type PhotoAlertItem = StoreValue['photoAlerts'][number];

/** Hiện trọn tối đa ngần này cảnh báo; còn lại chỉ đếm. */
const MAX_LISTED = 2;

const receiptName = (receipt: Transaction): string => `${receipt.supplierName}, ${formatDate(receipt.date)}`;

/** Người cân phải nhận ra đúng phiếu nào để xem lại: "Phiếu Chú Bảy, 19/10/2026". */
const subject = (notice: SyncNoticeItem, data: AppData): string => {
  switch (notice.entity) {
    case 'transaction': {
      const receipt = data.transactions.find((t) => t.id === notice.recordId);
      return receipt ? `${L.syncNoticeReceipt} ${receiptName(receipt)}` : L.syncNoticeReceipt;
    }
    case 'draft': {
      const draft = data.drafts.find((d) => d.id === notice.recordId);
      // Nháp mới mở có thể chưa có tên người bán — khi đó giờ sửa cuối là thứ duy nhất để nhận ra.
      const name = draft?.supplierName.trim();
      return draft ? `${L.syncNoticeDraft} ${name ? `${name}, ` : ''}${formatDate(draft.updatedAt)}` : L.syncNoticeDraft;
    }
    case 'payment': {
      const receipt = data.transactions.find((t) => t.id === notice.transactionId);
      const amount = notice.amount === undefined ? '' : ` ${formatVnd(notice.amount)}`;
      return `${L.syncNoticePayment}${amount}${receipt ? ` ${L.syncNoticeForReceipt} ${receiptName(receipt)}` : ''}`;
    }
    case 'supplier': {
      const party = data.suppliers.find((p) => p.id === notice.recordId);
      return party ? `${L.syncNoticeSupplier} ${party.name}` : L.syncNoticeSupplier;
    }
    case 'buyer': {
      const party = data.buyers.find((p) => p.id === notice.recordId);
      return party ? `${L.syncNoticeBuyer} ${party.name}` : L.syncNoticeBuyer;
    }
    case 'product': {
      const product = data.products.find((p) => p.id === notice.recordId);
      return product ? `${L.syncNoticeProduct} ${product.name}` : L.syncNoticeProduct;
    }
    default:
      return L.syncNoticeOther;
  }
};

const consequence = (notice: SyncNoticeItem): string => {
  if (notice.code === 'ORDER_NOT_OPEN') return L.syncOrderNotOpen;
  return notice.entity === 'payment' ? L.syncPaymentOnDeleted : L.syncRecordDeleted;
};

export const noticeText = (notice: SyncNoticeItem, data: AppData): string =>
  `${subject(notice, data)} ${consequence(notice)}`;

/** Phiếu (tiền đã chốt) và lần trả quan trọng hơn nháp, danh bạ. */
const rank = (notice: SyncNoticeItem): number =>
  notice.entity === 'transaction' ? 0 : notice.entity === 'payment' ? 1 : 2;

/**
 * Mỗi op nhận cảnh báo riêng, nên một bản ghi sửa nhiều lần là nhiều cảnh báo y hệt — kể một lần. Nháp đã
 * chốt thành phiếu thì không còn trong sổ: phiếu mang cảnh báo của chính nó, kể thêm nháp chỉ làm người cân
 * rối ("Phiếu nháp" không tên) và đẩy phiếu thật ra khỏi câu.
 */
const worthTelling = (notices: readonly SyncNoticeItem[], data: AppData): SyncNoticeItem[] => {
  const seen = new Set<string>();
  const drafts = new Set(data.drafts.map((d) => d.id));
  return notices
    .filter((notice) => {
      const key = `${notice.entity}:${notice.recordId}:${notice.code}`;
      if (seen.has(key) || (notice.entity === 'draft' && !drafts.has(notice.recordId))) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => rank(a) - rank(b));
};

const when = (date: string | undefined): string => (date ? `, ${formatDate(date)}` : '');
const money = (amount: number | undefined): string => (amount === undefined ? '' : `, ${formatVnd(amount)}`);

/** "Phiếu Chú Bảy, 19/10/2026, 1.200.000₫" — đủ để người cân nhập lại. `null`: không phải phiếu / tiền / nháp. */
export const droppedLine = (item: DroppedItem): string | null => {
  const name = item.name?.trim() || L.walkIn;
  switch (item.entity) {
    case 'transaction':
      return `${item.kind === 'softDelete' ? `${L.droppedDelete} ` : ''}${L.syncNoticeReceipt} ${name}${when(item.date)}${money(item.amount)}`;
    case 'payment': {
      const amount = item.amount === undefined ? '' : ` ${formatVnd(item.amount)}`;
      const of = item.name ? ` ${L.syncNoticeForReceipt} ${name}${when(item.date)}` : '';
      return `${item.kind === 'softDelete' ? `${L.droppedDelete} ` : ''}${L.syncNoticePayment}${amount}${of}`;
    }
    case 'draft':
      return `${L.syncNoticeDraft} ${name}${money(item.amount)}`;
    default:
      return null;
  }
};

/** Từng dòng cho thẻ "đã bỏ vì đổi chi nhánh" (B10); danh bạ, mặt hàng… gộp thành một dòng đếm. */
export const droppedLines = (items: readonly DroppedItem[]): string[] => {
  const lines: string[] = [];
  let others = 0;
  for (const item of items) {
    const line = droppedLine(item);
    if (line) lines.push(line);
    else others++;
  }
  if (others > 0) lines.push(`${others} ${L.droppedOthers}`);
  return lines;
};

/** Ảnh của phiếu / nháp nào — "ảnh bị từ chối" mà không nói phiếu nào thì không ai đi chụp lại được. */
const photoOwner = (id: string, data: AppData): string | undefined => {
  const receipt = data.transactions.find((t) => t.attachmentIds?.includes(id));
  if (receipt) return `${L.syncNoticeReceipt} ${receiptName(receipt)}`;
  const draft = data.drafts.find((d) => d.attachmentIds?.includes(id));
  return draft ? `${L.syncNoticeDraft} ${draft.supplierName.trim() || L.walkIn}` : undefined;
};

/** B6: ảnh bị từ chối hẳn (chỉ còn trên máy này) và ảnh thử mãi không lên (vẫn đang thử). */
export const photoAlertText = (alerts: readonly PhotoAlertItem[], data: AppData): string[] =>
  (['rejected', 'stalled'] as const).flatMap((reason) => {
    const ids = [...new Set(alerts.filter((a) => a.reason === reason).map((a) => a.id))];
    if (ids.length === 0) return [];
    const owners = [...new Set(ids.map((id) => photoOwner(id, data)).filter((o): o is string => Boolean(o)))];
    const which = owners.length > 0 ? ` (${owners.slice(0, MAX_LISTED).join('; ')}${owners.length > MAX_LISTED ? '…' : ''})` : '';
    return [`${ids.length} ${reason === 'rejected' ? L.photoRejected : L.photoStalled}${which}`];
  });

/** Một câu cho cả lượt, hoặc `null` nếu không có gì phải báo. */
export const syncNoticeMessage = (
  dropped: number,
  all: readonly SyncNoticeItem[],
  data: AppData,
  photos: readonly PhotoAlertItem[] = [],
): string | null => {
  const notices = worthTelling(all, data);
  const parts: string[] = [];
  if (dropped > 0) parts.push(`${dropped} ${L.branchOpsDropped}`);
  parts.push(...photoAlertText(photos, data));
  parts.push(...notices.slice(0, MAX_LISTED).map((notice) => noticeText(notice, data)));
  if (notices.length > MAX_LISTED) parts.push(`+${notices.length - MAX_LISTED} ${L.syncNoticesMore}`);
  return parts.length > 0 ? parts.join(' · ') : null;
};
