import { lineTotals, transactionTotals } from '@/core/calc';
import { formatDateTime, formatQuantity, formatVnd } from '@/core/format';
import { numberToVietnameseWords } from '@/core/numberToWords';
import type { Transaction } from '@/core/types';
import { L } from '@/i18n/labels';

interface ReceiptVoucherProps {
  readonly tx: Transaction;
  readonly businessName: string;
}

/**
 * Biên nhận đưa cho người bán cầm về.
 *
 * 🔴 Thiết kế theo khổ giấy nhiệt 80mm NGAY TỪ BÂY GIỜ: một cột, đen trên
 * trắng, không nền màu, không xám nhạt, không đổ bóng. Máy in nhiệt đã hoãn,
 * nhưng ràng buộc này miễn phí và tránh phải thiết kế lại toàn bộ về sau.
 *
 * Có "số tiền bằng chữ" vì đó là thứ người nhận đọc để đối chiếu, và vì biên
 * nhận viết tay ở vựa xưa nay vẫn ghi như vậy.
 */
export function ReceiptVoucher({ tx, businessName }: ReceiptVoucherProps) {
  const { netWeight, total, debt } = transactionTotals(tx);
  const isSale = tx.kind === 'sale';

  return (
    <article className="receipt-voucher mx-auto w-full max-w-[80mm] bg-card p-4 text-ink">
      <header className="border-b border-dashed border-rule pb-2 text-center">
        <p className="text-base font-extrabold uppercase">{businessName}</p>
        <p className="mt-1 text-sm font-bold">{isSale ? L.saleReceipt : L.purchaseReceipt}</p>
      </header>

      <dl className="mt-2 text-sm">
        <Row label={L.receiptNumber} value={tx.id.slice(0, 8).toUpperCase()} />
        <Row label={L.time} value={formatDateTime(tx.date)} />
        <Row label={isSale ? L.buyer : L.supplier} value={tx.supplierName} />
      </dl>

      <table className="mt-2 w-full border-t border-dashed border-rule pt-2 text-sm">
        <caption className="sr-only">{L.product}</caption>
        <tbody>
          {tx.lines.map((line) => {
            const lt = lineTotals(line);
            return (
              <tr key={line.id} className="align-top break-inside-avoid">
                <td className="py-1">
                  <span className="block font-semibold">{line.productName}</span>
                  <span className="num block text-xs">
                    {formatQuantity(lt.netWeight, line.unit)} × {formatVnd(line.pricePerUnit)}
                  </span>
                </td>
                <td className="num py-1 text-right font-semibold">{formatVnd(lt.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {tx.adjustments?.map((adj) => (
        <div key={adj.id} className="flex justify-between border-t border-dashed border-rule pt-1 text-sm">
          <span>{adj.label}</span>
          <span className="num">{formatVnd(adj.amount)}</span>
        </div>
      ))}

      <div className="mt-2 border-t border-dashed border-rule pt-2 text-sm">
        <Row label={L.totalNetWeight} value={formatQuantity(netWeight)} />
        <div className="flex justify-between text-base font-extrabold">
          <span>{L.total}</span>
          <span className="num">{formatVnd(total)}</span>
        </div>
        <p className="mt-1 text-xs italic">
          {L.amountInWords}: {numberToVietnameseWords(total)} đồng
        </p>
        <Row label={isSale ? L.collected : L.paid} value={formatVnd(tx.amountPaid)} />
        {debt > 0 && (
          <Row label={isSale ? L.remainingReceivable : L.remainingDebt} value={formatVnd(debt)} />
        )}
      </div>

      {tx.note && <p className="mt-2 text-xs">{L.note}: {tx.note}</p>}

      <div className="mt-6 text-center text-xs">
        <p>{L.signatureLine}</p>
        <p className="mt-10 border-t border-dashed border-rule pt-1">{L.madeWith}</p>
      </div>
    </article>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="num text-right font-medium">{value}</span>
    </div>
  );
}
