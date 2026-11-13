import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Chip } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import { cashPaidOnDay, needsCashReminder } from '@mambo/core/cashReminder';
import { debtGroups, type DebtGroup, type DebtSide } from '@mambo/core/debtSelectors';
import type { PaymentMethod, Transaction } from '@mambo/core/types';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { useStore } from '@/data/useStore';
import { L, SUB } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { CashReminderDialog } from '../shared/CashReminderDialog';
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
  readonly preset?: { readonly amount: number; readonly method: PaymentMethod };
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
  const [cashAsk, setCashAsk] = useState<{ readonly tx: Transaction; readonly amount: number } | null>(null);
  // V13: gói Pro ghi hình thức trả cho nông hộ (bên phải trả); bên phải thu giữ như cũ.
  const payQr = useEntitlement('pay:qr');

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
    onPayFull: (tx: Transaction, debt: number) => {
      if (target !== 'payable' || !payQr) return payOf(target)(tx, debt);
      // Trả một chạm mà chạm ngưỡng tiền mặt trong ngày: hỏi trước, không ghi thẳng.
      if (needsCashReminder(data, tx.counterpartyId, debt, 'cash')) return setCashAsk({ tx, amount: debt });
      return payPayable(tx, debt, 'cash');
    },
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
        // Mở lại là dựng mới: số tiền / hình thức đặt sẵn chỉ đọc lúc dựng.
        key={partial ? `${partial.tx.id}:${partial.preset?.method ?? ''}` : 'none'}
        tx={partial?.tx ?? null}
        side={partial?.side ?? 'payable'}
        withMethod={payQr && partial?.side === 'payable'}
        preset={partial?.preset}
        onConfirm={(tx, amount, method) => {
          if (partial) payOf(partial.side)(tx, amount, method);
          setPartial(null);
        }}
        onCancel={() => setPartial(null)}
      />

      <CashReminderDialog
        open={cashAsk !== null}
        paidToday={cashAsk ? cashPaidOnDay(data, cashAsk.tx.counterpartyId, new Date()) : 0}
        onTransfer={() => {
          if (cashAsk) setPartial({ tx: cashAsk.tx, side: 'payable', preset: { amount: cashAsk.amount, method: 'transfer' } });
          setCashAsk(null);
        }}
        onCash={() => {
          if (cashAsk) payPayable(cashAsk.tx, cashAsk.amount, 'cash');
          setCashAsk(null);
        }}
        onCancel={() => setCashAsk(null)}
      />
    </PageContainer>
  );
}
