import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { formatDate } from '@mambo/core/format';
import { L } from '@/i18n/labels';
import type { Namesake, PartyChoice } from './namesakes';

interface NamesakeDialogProps {
  readonly open: boolean;
  readonly name: string;
  readonly namesakes: readonly Namesake[];
  readonly onPick: (choice: PartyChoice) => void;
  readonly onCancel: () => void;
}

/**
 * "Đã có 'Anh Ba' (SĐT…) — chọn người này hay tạo người mới?" (B3)
 *
 * Không có lựa chọn mặc định: bấm nhầm "dùng lại" là gộp công nợ của hai người, bấm nhầm "tạo mới" là tách
 * công nợ một người làm hai — cả hai đều phải chọn bằng tay.
 */
export function NamesakeDialog({ open, name, namesakes, onPick, onCancel }: NamesakeDialogProps) {
  return (
    <Dialog
      open={open}
      title={L.namesakeTitle}
      description={`${L.namesakeHas} "${name.trim()}". ${L.namesakeAsk}`}
      onClose={onCancel}
    >
      <ul className="flex flex-col gap-2">
        {namesakes.map(({ party, receipts, lastDate }) => (
          <li key={party.id}>
            <button
              type="button"
              onClick={() => onPick({ id: party.id, name: party.name })}
              className="flex min-h-14 w-full flex-col items-start rounded-xl border border-rule bg-card px-3 py-2 text-left"
            >
              <span className="font-bold text-ink">{party.name}</span>
              <span className="num text-sm text-ink-2">
                {party.phone || L.namesakeNoPhone}
                {party.location ? ` · ${party.location}` : ''}
              </span>
              <span className="num text-sm text-ink-3">
                {receipts > 0 && lastDate
                  ? `${receipts} ${L.receiptCountUnit} · ${L.lastTime} ${formatDate(lastDate)}`
                  : L.namesakeNoReceipt}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2">
        <Button tone="primary" block onClick={() => onPick({ asNew: true })}>
          {L.namesakeNew}
        </Button>
        <p className="text-sm text-ink-3">{L.namesakeNewHint}</p>
        <Button tone="quiet" block onClick={onCancel}>
          {L.cancel}
        </Button>
      </div>
    </Dialog>
  );
}
