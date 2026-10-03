import { computeReceiptTotal } from '@/core/calc';
import { formatVndShort } from '@/core/format';
import type { DraftReceipt } from '@/core/types';
import { L } from '@/i18n/labels';
import { PlusIcon } from '@/components/ui/icons';

interface SessionRailProps {
  readonly drafts: readonly DraftReceipt[];
  readonly activeId?: string;
  readonly onSelect: (draftId: string) => void;
  readonly onNewCustomer: () => void;
}

/**
 * Thanh "Đang cân" — cân nhiều khách xen kẽ là nghiệp vụ có thật ở vựa: xe này
 * đang đổ hàng thì xe kia tới.
 *
 * Mỗi chip là một `DraftReceipt` đã có sẵn, chuyển chip chỉ đổi `?draft=<id>`.
 * KHÔNG dựng bảng mới cho việc này — thêm schema là thêm chuyện đồng bộ.
 */
export function SessionRail({ drafts, activeId, onSelect, onNewCustomer }: SessionRailProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
      {drafts.map((draft) => {
        const { total } = computeReceiptTotal(draft.lines);
        const active = draft.id === activeId;
        return (
          <button
            key={draft.id}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(draft.id)}
            className={`flex min-h-12 shrink-0 flex-col items-start rounded-xl border px-3 py-1.5 text-left lg:w-full ${
              active ? 'border-brand bg-brand text-paper' : 'border-rule bg-card text-ink-2'
            }`}
          >
            <span className="max-w-40 truncate text-sm font-semibold lg:max-w-none">
              {draft.supplierName || L.walkIn}
            </span>
            <span className="num text-xs opacity-90">{formatVndShort(total)}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onNewCustomer}
        className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-rule px-3 text-sm font-semibold text-ink-2 lg:w-full"
      >
        <PlusIcon className="h-4 w-4" />
        {L.newCustomer}
      </button>
    </div>
  );
}
