/**
 * Hình thức trả nông hộ (KE_HOACH_GOI_PRO V13, gói Pro `pay:qr`). Nội dung chuyển khoản `PM-` + 8 ký tự đầu của id
 * phiếu: người bán nhìn sao kê ngân hàng là biết tiền của phiếu nào, vựa đối chiếu lại cũng vậy.
 */

import type { PaymentMethod } from '@mambo/core/types';
import { L } from '@/i18n/labels';

export const PAY_METHOD_OPTIONS: readonly { readonly value: PaymentMethod; readonly label: string }[] = [
  { value: 'cash', label: L.paidByCash },
  { value: 'transfer', label: L.paidByTransfer },
];

export const transferContent = (txId: string): string => `PM-${txId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/** Chép nội dung chuyển khoản; trả câu báo cho toast. */
export const copyTransferContent = async (txId: string): Promise<string> => {
  try {
    await navigator.clipboard.writeText(transferContent(txId));
    return L.transferCopied;
  } catch {
    return L.transferCopyFailed;
  }
};
