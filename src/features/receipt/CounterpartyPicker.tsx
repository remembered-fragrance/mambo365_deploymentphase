import { useMemo, useState } from 'react';
import { RECEIPT_LIMITS } from '@mambo/contracts';
import { Input } from '@/components/ui/Input';
import { formatDate, formatVnd } from '@mambo/core/format';
import { supplierSummaries } from '@mambo/core/supplierSelectors';
import { buyerSummaries } from '@mambo/core/buyerSelectors';
import { transactionTotals } from '@mambo/core/calc';
import type { AppData, TransactionKind } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { chipHint } from './namesakes';

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

  const parties = useMemo(() => {
    const all = kind === 'sale' ? data.buyers : data.suppliers;
    const summaries = kind === 'sale' ? buyerSummaries(data) : supplierSummaries(data);
    return summaries.map((s) => {
      const party = all.find((p) => p.id === s.id);
      return { id: s.id, name: s.name, hint: party ? chipHint(party, all, s.lastDate) : undefined };
    });
  }, [data, kind]);

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
        maxLength={RECEIPT_LIMITS.partyName}
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
                {party.hint && <span className="num ml-1 font-normal text-ink-3">· {party.hint}</span>}
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
