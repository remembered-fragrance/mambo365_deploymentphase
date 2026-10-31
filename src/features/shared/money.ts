/**
 * Ô tiền dùng chung ô số với ô cân, nên gõ được dấu phẩy ("50000,5"). Tiền VNĐ thì là đồng
 * nguyên, và máy chủ từ chối số lẻ: một lần trả lẻ sẽ kẹt ở "xung đột", không lên mạng được.
 * Không chặn phím phẩy (người dùng quen tay vẫn gõ), mà đọc ra số đã làm tròn tới đồng gần nhất
 * (0,5 làm tròn lên). `NumberField` có `money` thì báo cho người dùng thấy số sẽ lưu.
 */

import { parseNumber } from '@mambo/core/parseNumber';

export const parseMoney = (raw: string): number => Math.round(parseNumber(raw));

/** Số gõ vào có phần lẻ khác 0, tức số lưu sẽ khác số gõ. */
export const isRoundedMoney = (raw: string): boolean => parseNumber(raw) !== parseMoney(raw);
