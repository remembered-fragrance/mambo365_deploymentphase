import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Chip } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import { debtGroups, type DebtGroup, type DebtSide } from '@/core/debtSelectors';
import type { Transaction } from '@/core/types';
import { useStore } from '@/data/useStore';
import { L, SUB } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { DebtColumn } from './DebtColumn';
import { PayDebtDialog } from './PayDebtDialog';
import { usePayDebt } from './usePayDebt';

const SIDE_OPTIONS = [
  { value: 'payable', label: L.tabPayable },
  { value: 'receivable', label: L.tabReceivable },
];

interface PartialTarget {
  readonly tx: Transaction;
  readonly side: DebtSide;
}

/**
 * Công nợ.
 *
 * Máy tính: hai cột song song, không tab — màn rộng mà bắt bấm tab để xem cột
 * bên kia là lãng phí đúng thứ máy tính đang có sẵn.
 * Điện thoại: một cột, chuyển bằng tab.
 *
 * Lựa chọn nằm trên URL (`?ben=`, `?quahan=1`) nên gửi được cho người khác và
 * bấm quay lại không mất bộ lọc.
 */
export function DebtsPage() {
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const [partial, setPartial] = useState<PartialTarget | null>(null);

  const side: DebtSide = params.get('ben') === 'receivable' ? 'receivable' : 'payable';
  const onlyOverdue = params.get('quahan') === '1';

  const payable = useMemo(() => debtGroups(data, 'payable'), [data]);
  const receivable = useMemo(() => debtGroups(data, 'receivable'), [data]);

  const payPayable = usePayDebt('payable');
  const payReceivable = usePayDebt('receivable');
  const payOf = (target: DebtSide) => (target === 'payable' ? payPayable : payReceivable);

  const shown = (groups: readonly DebtGroup[]): DebtGroup[] =>
    onlyOverdue ? groups.filter((g) => g.overdue) : [...groups];

  const patch = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) merged.delete(key);
      else merged.set(key, value);
    }
    setParams(merged, { replace: true });
  };

  const columnProps = (target: DebtSide) => ({
    side: target,
    groups: shown(target === 'payable' ? payable : receivable),
    onPayFull: (tx: Transaction, debt: number) => payOf(target)(tx, debt),
    onPayPart: (tx: Transaction) => setPartial({ tx, side: target }),
  });

  return (
    <PageContainer width="wide">
      <PageHeader title={L.navDebts} subtitle={SUB.debt} actions={<HelpButton topic="debts" />} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip
          label={L.filterOverdue}
          selected={onlyOverdue}
          onSelect={() => patch({ quahan: onlyOverdue ? undefined : '1' })}
        />
        <div className="lg:hidden">
          <Segmented
            label={L.navDebts}
            value={side}
            options={SIDE_OPTIONS}
            onValueChange={(value) => patch({ ben: value })}
          />
        </div>
      </div>

      <div className="hidden gap-6 lg:grid lg:grid-cols-2">
        <DebtColumn {...columnProps('payable')} />
        <DebtColumn {...columnProps('receivable')} />
      </div>

      <div className="lg:hidden">
        <DebtColumn {...columnProps(side)} />
      </div>

      <PayDebtDialog
        tx={partial?.tx ?? null}
        side={partial?.side ?? 'payable'}
        onConfirm={(tx, amount) => {
          if (partial) payOf(partial.side)(tx, amount);
          setPartial(null);
        }}
        onCancel={() => setPartial(null)}
      />
    </PageContainer>
  );
}
