import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PencilIcon, PhoneIcon } from '@/components/ui/icons';
import { transactionTotals } from '@/core/calc';
import { formatDate, formatVnd } from '@/core/format';
import type { PartySummary, PartyRole } from '@/core/partySelectors';
import type { Transaction } from '@/core/types';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

interface PartnerDetailProps {
  readonly party: PartySummary;
  readonly role: PartyRole;
  readonly transactions: readonly Transaction[];
  readonly onEdit: () => void;
}

/** Một đối tác: liên lạc, tổng kết, và những phiếu gần đây của họ. */
export function PartnerDetail({ party, role, transactions, onEdit }: PartnerDetailProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-ink">{party.name}</p>
            {party.location && <p className="text-sm text-ink-3">{party.location}</p>}
          </div>
          {party.hasProfile && (
            <Button aria-label={L.editParty} onClick={onEdit}>
              <PencilIcon className="h-4 w-4" />
              {L.editParty}
            </Button>
          )}
        </div>

        {party.phone && (
          <a
            href={`tel:${party.phone.replace(/\s/g, '')}`}
            className="num mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand px-4 font-bold text-brand"
          >
            <PhoneIcon className="h-4 w-4" />
            {L.callPhone} {party.phone}
          </a>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-3">{L.colReceiptCount}</dt>
            <dd className="num font-bold text-ink">
              {party.txCount} {L.receiptCountUnit}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">{L.colTotalMoney}</dt>
            <dd className="num font-bold text-ink">{formatVnd(party.total)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">
              {role === 'supplier' ? L.remainingDebt : L.remainingReceivable}
            </dt>
            <dd className="num font-bold text-ink">{formatVnd(party.debt)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">{L.colLastDate}</dt>
            <dd className="num font-bold text-ink">
              {party.lastDate ? formatDate(party.lastDate) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3">
          {L.partyHistory}
        </h3>
        <ul className="flex flex-col gap-2">
          {transactions.map((tx) => {
            const { total, debt } = transactionTotals(tx);
            return (
              <li key={tx.id}>
                <Link
                  to={ROUTES.receiptDetail(tx.id)}
                  className="card flex items-center gap-3 p-3"
                >
                  <span className="num min-w-0 flex-1 text-sm text-ink-2">
                    {formatDate(tx.date)}
                  </span>
                  <span className="num shrink-0 font-bold text-ink">{formatVnd(total)}</span>
                  {debt > 0 && <Badge tone="payable" mark="!" label={formatVnd(debt)} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
