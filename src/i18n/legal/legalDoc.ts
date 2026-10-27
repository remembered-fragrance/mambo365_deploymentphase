/**
 * Khung chung cho ba trang Điều khoản · Quyền riêng tư · Hướng dẫn.
 *
 * Nội dung là DỮ LIỆU (không phải JSX) để chữ nằm trong `i18n/` đúng luật dự án,
 * và để test đối chiếu được lời hứa với hằng số thật trong `config.ts`.
 */

import { LEGAL_OPERATOR, PRICE_MONTHLY, PRICE_YEARLY, SUPPORT_ZALO } from '@/config';

export type LegalBlock =
  | { readonly kind: 'p'; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly string[]; readonly ordered?: boolean }
  | { readonly kind: 'table'; readonly head: readonly string[]; readonly rows: readonly (readonly string[])[] }
  | { readonly kind: 'note'; readonly text: string };

export interface LegalSection {
  /** Neo trên trang (`#id`) — mục lục và liên kết chéo trỏ vào đây. */
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly LegalBlock[];
}

export interface LegalDoc {
  readonly title: string;
  /** Dòng phụ dưới tiêu đề: phiên bản, ngày áp dụng. */
  readonly meta?: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
}

export const p = (text: string): LegalBlock => ({ kind: 'p', text });
export const list = (...items: string[]): LegalBlock => ({ kind: 'list', items });
export const steps = (...items: string[]): LegalBlock => ({ kind: 'list', items, ordered: true });
export const note = (text: string): LegalBlock => ({ kind: 'note', text });
export const table = (head: string[], ...rows: string[][]): LegalBlock => ({ kind: 'table', head, rows });

const PENDING = 'đang cập nhật';

/** "149.000₫" — i18n là lá dùng chung nên không import `core/format`. */
export const vnd = (n: number): string => `${n.toLocaleString('vi-VN')}₫`;

export const PRICE_TEXT = `${vnd(PRICE_MONTHLY)} mỗi tháng, hoặc ${vnd(PRICE_YEARLY)} mỗi năm`;

/** Khối "Ai vận hành" dùng chung cho Điều khoản và Chính sách — một chỗ điền, hai trang khớp nhau. */
export const OPERATOR_ROWS: string[][] = [
  ['Chủ thể vận hành', LEGAL_OPERATOR.name ?? PENDING],
  ['Địa chỉ', LEGAL_OPERATOR.address ?? PENDING],
  ['Email tiếp nhận yêu cầu về dữ liệu', LEGAL_OPERATOR.email ?? PENDING],
  ['Zalo hỗ trợ', `${SUPPORT_ZALO} — trả lời trong ngày làm việc, 7h–19h`],
];

export const LEGAL_BASIS = [
  'Bộ luật Dân sự 2015',
  'Luật Giao dịch điện tử 2023 (20/2023/QH15)',
  'Luật Bảo vệ quyền lợi người tiêu dùng 2023 (19/2023/QH15)',
  'Luật Bảo vệ dữ liệu cá nhân 2025 (91/2025/QH15) và Nghị định 356/2025/NĐ-CP',
  'Luật An ninh mạng và các văn bản hướng dẫn',
];
