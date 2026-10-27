/**
 * Tên gõ vào trùng người đã có trong sổ (B3).
 *
 * Core mặc định dùng lại hồ sơ cùng tên (không phân biệt hoa thường) — hai "Anh Ba" khác nhau bị gộp chung
 * công nợ, và nếu hồ sơ cũ đã kết nối với tài khoản nông dân thì nông dân đó thấy luôn phiếu của người kia.
 * Nên người dùng chưa CHỌN ai mà tên trùng thì phải hỏi trước khi chốt; câu trả lời đi vào `finish` dưới dạng
 * `PartyChoice`.
 */

import { formatDate } from '@mambo/core/format';
import { partiesNamed } from '@mambo/core/partyActions';
import type { AppData, Buyer, Supplier, TransactionKind } from '@mambo/core/types';

/** Người dùng chọn đúng người đã có (`id`), hay tạo người mới cùng tên (`asNew`). */
export type PartyChoice = { readonly id: string; readonly name: string } | { readonly asNew: true };

export interface Namesake {
  readonly party: Supplier | Buyer;
  /** Số phiếu và ngày phiếu gần nhất — để phân biệt hai người cùng tên mà chưa ai có SĐT. */
  readonly receipts: number;
  readonly lastDate?: string;
}

/**
 * Dòng phụ của chip gợi ý: chỉ khi trong danh sách có người khác cùng tên — hai chip "Anh Ba" giống hệt nhau thì
 * bấm cũng như đoán. Ưu tiên SĐT, rồi khu vực, rồi ngày phiếu gần nhất; không có gì thì để trống (hộp hỏi lúc chốt
 * không hiện vì người dùng đã chọn, nên chip là chỗ phân biệt duy nhất).
 */
export const chipHint = (
  party: Supplier | Buyer,
  all: readonly (Supplier | Buyer)[],
  lastDate: string | undefined,
): string | undefined => {
  if (partiesNamed(all, party.name).length < 2) return undefined;
  return party.phone ?? party.location ?? (lastDate ? formatDate(lastDate) : undefined);
};

/** Rỗng khi người dùng đã chọn từ gợi ý (`counterpartyId`) hoặc tên chưa trùng ai. */
export const namesakesOf = (
  data: AppData,
  kind: TransactionKind,
  name: string,
  counterpartyId: string | undefined,
): Namesake[] => {
  if (counterpartyId) return [];
  return partiesNamed(kind === 'sale' ? data.buyers : data.suppliers, name).map((party) => {
    const own = data.transactions.filter((t) => t.counterpartyId === party.id);
    const lastDate = own.reduce<string | undefined>((max, t) => (!max || t.date > max ? t.date : max), undefined);
    return { party, receipts: own.length, lastDate };
  });
};
