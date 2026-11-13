/**
 * Phần "Thêm thông tin khác" của phiếu: khoản cộng/trừ, ghi chú, ảnh. Gập lại thì nút phải nói
 * bên trong đang có gì — không thì gập là giấu mất khoản trừ khỏi mắt người chốt phiếu.
 */

import type { PriceAdjustment } from '@mambo/core/types';
import { L } from '@/i18n/labels';

export interface MoreInfo {
  readonly adjustments: readonly PriceAdjustment[];
  readonly note: string;
  readonly attachmentIds: readonly string[];
}

export const hasMoreInfo = (info: MoreInfo): boolean =>
  info.adjustments.length > 0 || info.note.trim() !== '' || info.attachmentIds.length > 0;

/** "2 khoản cộng/trừ, có ghi chú, 1 ảnh" — rỗng khi chưa có gì. */
export const moreInfoSummary = (info: MoreInfo): string =>
  [
    info.adjustments.length > 0 ? `${info.adjustments.length} ${L.moreInfoAdjustments}` : null,
    info.note.trim() !== '' ? L.moreInfoHasNote : null,
    info.attachmentIds.length > 0 ? `${info.attachmentIds.length} ${L.moreInfoPhotos}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(', ');
