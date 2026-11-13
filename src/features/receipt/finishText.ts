import { transactionTotals } from '@mambo/core/calc';
import { formatVnd } from '@mambo/core/format';
import type { Transaction } from '@mambo/core/types';
import { L } from '@/i18n/labels';

/**
 * Câu báo ngay sau khi chốt phiếu. Tổng lấy từ `transactionTotals` của core — đúng con số in trên phiếu
 * và trong sổ nợ. Trước đây in số ĐÃ TRẢ dưới nhãn "Tổng phiếu": bấm "Ghi nợ & xong" phiếu 5 triệu báo
 * "Tổng phiếu: 0đ", người cân tưởng phiếu mất dòng hàng.
 */
export const finishMessage = (tx: Transaction): string => {
  const { total, debt } = transactionTotals(tx);
  const owed = tx.kind === 'sale' ? L.remainingReceivable : L.remainingDebt;
  return [`${L.total}: ${formatVnd(total)}`, ...(debt > 0 ? [`${owed} ${formatVnd(debt)}`] : []), tx.supplierName].join(
    ' · ',
  );
};
