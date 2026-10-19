/**
 * Câu báo sau một lượt đồng bộ: thao tác tự bỏ vì đổi chi nhánh, và các op máy chủ đã nhận kèm cảnh báo.
 * Toast chỉ hiện MỘT câu mỗi lúc (câu sau đè câu trước) — nên mọi thứ của một lượt gộp vào một câu.
 */

import { formatDate, formatVnd } from '@mambo/core/format';
import type { AppData, Transaction } from '@mambo/core/types';
import type { StoreValue } from '@/data/useStore';
import { L } from '@/i18n/labels';

export type SyncNoticeItem = StoreValue['syncWarnings'][number];

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

/** Một câu cho cả lượt, hoặc `null` nếu không có gì phải báo. */
export const syncNoticeMessage = (
  dropped: number,
  all: readonly SyncNoticeItem[],
  data: AppData,
): string | null => {
  const notices = worthTelling(all, data);
  const parts: string[] = [];
  if (dropped > 0) parts.push(`${dropped} ${L.branchOpsDropped}`);
  parts.push(...notices.slice(0, MAX_LISTED).map((notice) => noticeText(notice, data)));
  if (notices.length > MAX_LISTED) parts.push(`+${notices.length - MAX_LISTED} ${L.syncNoticesMore}`);
  return parts.length > 0 ? parts.join(' · ') : null;
};
