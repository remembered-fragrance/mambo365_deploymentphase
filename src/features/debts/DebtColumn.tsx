import { EmptyState } from '@/components/ui/EmptyState';
import type { DebtGroup, DebtSide } from '@/core/debtSelectors';
import { totalOf } from '@/core/debtSelectors';
import { formatVnd } from '@/core/format';
import type { Transaction } from '@/core/types';
import { L } from '@/i18n/labels';
import { DebtGroupCard } from './DebtGroupCard';

interface DebtColumnProps {
  readonly side: DebtSide;
  readonly groups: readonly DebtGroup[];
  readonly onPayFull: (tx: Transaction, debt: number) => void;
  readonly onPayPart: (tx: Transaction) => void;
}

/**
 * Một bên của màn Công nợ. Ở máy tính hai bên nằm cạnh nhau, ở điện thoại mỗi
 * lần chỉ hiện một bên — cùng một component, không viết hai lần.
 */
export function DebtColumn({ side, groups, onPayFull, onPayPart }: DebtColumnProps) {
  const payable = side === 'payable';

  if (groups.length === 0) {
    return (
      <EmptyState
        title={payable ? L.noPayable : L.noReceivable}
        description={L.noDebtHint}
        icon="🧾"
      />
    );
  }

  return (
    <section>
      <p
        className={`num mb-2 rounded-lg border border-rule bg-card px-3 py-2 text-sm font-semibold ${
          payable ? 'text-payable' : 'text-receivable'
        }`}
      >
        {payable ? L.totalPayable : L.totalReceivable}: {formatVnd(totalOf(groups))}
      </p>

      <ul className="flex flex-col gap-2">
        {groups.map((group) => (
          <DebtGroupCard
            key={group.partyId}
            group={group}
            side={side}
            onPayFull={onPayFull}
            onPayPart={onPayPart}
          />
        ))}
      </ul>
    </section>
  );
}
