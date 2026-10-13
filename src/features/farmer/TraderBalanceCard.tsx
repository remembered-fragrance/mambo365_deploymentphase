import { Link } from 'react-router-dom';
import { formatDate, formatVnd } from '@mambo/core/format';
import type { LinkedBalanceItem } from '@mambo/contracts';
import { L } from '@/i18n/labels';

/** Một vựa đã kết nối: còn nợ mình / mình còn nợ, số phiếu. `to` vắng = không bấm được (đang ở trang vựa). */
export function TraderBalanceCard({ item, to }: { readonly item: LinkedBalanceItem; readonly to?: string }) {
  const body = (
    <>
      <p className="truncate text-lg font-extrabold text-ink">{item.organization.name}</p>
      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-3">{L.farmerTheyOwe}</dt>
          <dd className={`num text-lg font-extrabold ${item.theyOwe > 0 ? 'text-alert' : 'text-ink'}`}>
            {item.theyOwe > 0 ? formatVnd(item.theyOwe) : L.paidInFull}
          </dd>
        </div>
        {item.youOwe > 0 && (
          <div>
            <dt className="text-ink-3">{L.farmerYouOwe}</dt>
            <dd className="num text-lg font-extrabold text-ink">{formatVnd(item.youOwe)}</dd>
          </div>
        )}
        <div>
          <dt className="text-ink-3">{L.colReceiptCount}</dt>
          <dd className="num font-bold text-ink">
            {item.receiptCount} {L.receiptCountUnit}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">{L.farmerLastReceipt}</dt>
          <dd className="num font-bold text-ink">{item.lastReceiptAt ? formatDate(item.lastReceiptAt) : '—'}</dd>
        </div>
      </dl>
    </>
  );

  return to ? (
    <Link to={to} className="card block p-4">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}
