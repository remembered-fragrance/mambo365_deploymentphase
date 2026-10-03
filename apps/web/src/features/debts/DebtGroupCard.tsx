import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChevronRightIcon } from '@/components/ui/icons';
import { transactionTotals } from '@/core/calc';
import type { DebtGroup, DebtSide } from '@/core/debtSelectors';
import { dueDateOf, isOverdue } from '@/core/debtSelectors';
import { formatDate, formatVnd } from '@/core/format';
import type { Transaction } from '@/core/types';
import { L } from '@/i18n/labels';

interface DebtGroupCardProps {
  readonly group: DebtGroup;
  readonly side: DebtSide;
  readonly onPayFull: (tx: Transaction, debt: number) => void;
  readonly onPayPart: (tx: Transaction) => void;
}

/**
 * Một đối tác, gập lại. Mở ra mới thấy từng phiếu — chủ vựa cần biết "Cô Mai
 * còn nợ bao nhiêu" trước, "nợ ở phiếu nào" sau.
 */
export function DebtGroupCard({ group, side, onPayFull, onPayPart }: DebtGroupCardProps) {
  const [open, setOpen] = useState(false);
  const unpaid = group.transactions.filter((t) => transactionTotals(t).debt > 0);

  return (
    <li className="card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <ChevronRightIcon
          className={`h-5 w-5 shrink-0 text-ink-3 transition ${open ? 'rotate-90' : ''}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">{group.partyName}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-3">
            <span>
              {unpaid.length} {L.receiptsOfParty}
            </span>
            {group.overdue && <Badge tone="alert" mark="!" label={L.overdueMark} />}
            {!group.overdue && group.dueDate && (
              <span className="num">
                {L.dueOn} {formatDate(group.dueDate)}
              </span>
            )}
          </span>
        </span>
        <span
          className={`num shrink-0 text-right font-extrabold ${
            side === 'payable' ? 'text-payable' : 'text-receivable'
          }`}
        >
          {formatVnd(group.debt)}
        </span>
      </button>

      {open && (
        <ul className="border-t border-rule">
          {unpaid.map((tx) => (
            <DebtRow
              key={tx.id}
              tx={tx}
              side={side}
              onPayFull={onPayFull}
              onPayPart={onPayPart}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function DebtRow({
  tx,
  side,
  onPayFull,
  onPayPart,
}: {
  readonly tx: Transaction;
  readonly side: DebtSide;
  readonly onPayFull: (tx: Transaction, debt: number) => void;
  readonly onPayPart: (tx: Transaction) => void;
}) {
  const { total, debt } = transactionTotals(tx);
  const due = dueDateOf(tx);
  const late = isOverdue(tx);

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-rule px-3 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="num text-sm text-ink-2">
          {formatDate(tx.date)} · {formatVnd(total)}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
          <span className="num font-bold text-ink">{formatVnd(debt)}</span>
          {late ? (
            <Badge tone="alert" mark="!" label={L.overdueMark} />
          ) : (
            due && (
              <span className="num text-ink-3">
                {L.dueOn} {formatDate(due)}
              </span>
            )
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button onClick={() => onPayPart(tx)}>
          {side === 'payable' ? L.payPart : L.collectPart}
        </Button>
        <Button tone="primary" onClick={() => onPayFull(tx, debt)}>
          {side === 'payable' ? L.payFull : L.collectFull}
        </Button>
      </div>
    </li>
  );
}
