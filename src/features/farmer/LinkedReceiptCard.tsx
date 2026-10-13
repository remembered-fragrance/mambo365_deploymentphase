import { formatDateTime, formatQuantity, formatVnd } from '@mambo/core/format';
import type { LinkedReceipt } from '@mambo/contracts';
import { Badge } from '@/components/ui/Badge';
import { L } from '@/i18n/labels';

/**
 * Một phiếu bên giữ sổ cho mình xem — đúng các trường in trên biên nhận.
 * Tổng do máy chủ tính bằng @mambo/core: hiển thị nguyên số, không tính lại.
 */
export function LinkedReceiptCard({ receipt }: { readonly receipt: LinkedReceipt }) {
  const theyBought = receipt.kind === 'purchase';
  return (
    <article className="card p-4">
      <header className="flex items-center justify-between gap-3">
        <span className="num text-sm text-ink-2">{formatDateTime(receipt.date)}</span>
        <Badge
          tone={theyBought ? 'in' : 'out'}
          label={theyBought ? L.farmerKindTheyBought : L.farmerKindTheySold}
        />
      </header>

      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {receipt.lines.map((line, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="min-w-0 text-ink-2">
              {line.productName} · <span className="num">{formatQuantity(line.netWeight, line.unit)} × {formatVnd(line.pricePerUnit)}</span>
            </span>
            <span className="num shrink-0 font-bold text-ink">{formatVnd(line.total)}</span>
          </li>
        ))}
        {receipt.adjustments.map((adj, i) => (
          <li key={`adj-${i}`} className="flex justify-between gap-3 text-ink-3">
            <span>{adj.label}</span>
            <span className="num">{formatVnd(adj.amount)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-rule pt-3 text-sm">
        <div>
          <dt className="text-ink-3">{L.colTotalMoney}</dt>
          <dd className="num font-bold text-ink">{formatVnd(receipt.total)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{L.paid}</dt>
          <dd className="num font-bold text-ink">{formatVnd(receipt.paid)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{L.remainingDebt}</dt>
          <dd className={`num font-bold ${receipt.debt > 0 ? 'text-alert' : 'text-ink'}`}>
            {receipt.debt > 0 ? formatVnd(receipt.debt) : L.paidInFull}
          </dd>
        </div>
      </dl>
    </article>
  );
}
