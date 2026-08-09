import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import type { HistoryFilters, PaymentFilter, TimePeriod } from '@/core/filters';
import { L } from '@/i18n/labels';

interface ReceiptFilterSheetProps {
  readonly open: boolean;
  readonly filters: HistoryFilters;
  readonly onChange: (patch: Partial<HistoryFilters>) => void;
  readonly onClose: () => void;
}

const PERIODS: readonly { value: TimePeriod; label: string }[] = [
  { value: 'day', label: L.periodDay },
  { value: 'week', label: L.periodWeek },
  { value: 'month', label: L.periodMonth },
  { value: 'year', label: L.periodYear },
  { value: 'all', label: L.periodAll },
];

const PAYMENTS: readonly { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: L.filterAll },
  { value: 'unpaid', label: L.paymentUnpaid },
  { value: 'paid', label: L.paymentPaid },
];

/**
 * Bộ lọc nằm trong bảng trượt, không phải khối cao 300px luôn mở như bản demo —
 * trên điện thoại, khối đó đẩy danh sách phiếu xuống dưới màn hình.
 */
export function ReceiptFilterSheet({ open, filters, onChange, onClose }: ReceiptFilterSheetProps) {
  return (
    <BottomSheet open={open} title={L.filterTitle} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-2">{L.filterPeriod}</legend>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                selected={filters.period === p.value}
                onSelect={() => onChange({ period: p.value })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-2">{L.filterPayment}</legend>
          <div className="flex flex-wrap gap-2">
            {PAYMENTS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                selected={filters.payment === p.value}
                onSelect={() => onChange({ payment: p.value })}
              />
            ))}
          </div>
        </fieldset>

        <Button tone="primary" block onClick={onClose}>
          {L.confirm}
        </Button>
      </div>
    </BottomSheet>
  );
}
