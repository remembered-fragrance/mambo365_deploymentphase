import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { formatDate, formatVnd } from '@/core/format';
import { supplierSummaries } from '@/core/supplierSelectors';
import { buyerSummaries } from '@/core/buyerSelectors';
import { transactionTotals } from '@/core/calc';
import type { AppData, TransactionKind } from '@/core/types';
import { L } from '@/i18n/labels';

interface CounterpartyPickerProps {
  readonly data: AppData;
  readonly kind: TransactionKind;
  readonly name: string;
  readonly counterpartyId?: string;
  readonly onPick: (id: string | undefined, name: string) => void;
}

/**
 * Gõ tên là xong: có sẵn thì gợi ý, chưa có thì tạo mới lúc chốt phiếu.
 * Không bắt người dùng vào màn "thêm nông hộ" trước khi cân được cân đầu tiên.
 */
export function CounterpartyPicker({
  data,
  kind,
  name,
  counterpartyId,
  onPick,
}: CounterpartyPickerProps) {
  const [open, setOpen] = useState(false);

  const parties = useMemo(
    () =>
      kind === 'sale'
        ? buyerSummaries(data).map((b) => ({ id: b.id, name: b.name, lastDate: b.lastDate }))
        : supplierSummaries(data).map((s) => ({ id: s.id, name: s.name, lastDate: s.lastDate })),
    [data, kind],
  );

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    return parties.filter((p) => p.name && (!q || p.name.toLowerCase().includes(q))).slice(0, 6);
  }, [parties, name]);

  // Gợi ý "lần trước" — dữ liệu đã có sẵn, chỉ việc hiện ra.
  const lastReceipt = useMemo(() => {
    if (!counterpartyId) return undefined;
    return data.transactions
      .filter((t) => t.counterpartyId === counterpartyId && t.kind === kind)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [data.transactions, counterpartyId, kind]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={kind === 'sale' ? L.buyer : L.supplier}
        value={name}
        placeholder={L.walkIn}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => onPick(undefined, e.target.value)}
      />

      {open && matches.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {matches.map((party) => (
            <li key={party.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(party.id, party.name);
                  setOpen(false);
                }}
                className="min-h-11 rounded-full border border-rule bg-card px-3 text-sm font-medium text-ink-2"
              >
                {party.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lastReceipt && (
        <p className="num text-sm text-ink-3">
          {L.lastTime}: {lastReceipt.lines.map((l) => l.productName).join(', ')} ·{' '}
          {formatVnd(transactionTotals(lastReceipt).total)} · {formatDate(lastReceipt.date)}
        </p>
      )}
    </div>
  );
}
