import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { computeReceiptTotal } from '@/core/calc';
import { formatDateTime, formatVnd } from '@/core/format';
import type { DraftReceipt } from '@/core/types';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

interface DraftListProps {
  readonly drafts: readonly DraftReceipt[];
  readonly emptyTitle: string;
}

/**
 * Nháp mở lại bằng `?draft=<id>` — chạm một cái là về đúng phiếu đang cân dở.
 * Không có nút xoá ở đây: xoá nằm trong menu "⋯" của màn tạo phiếu, để tay đeo
 * găng không chạm nhầm vào giữa lúc đang cân.
 */
export function DraftList({ drafts, emptyTitle }: DraftListProps) {
  if (drafts.length === 0) return <EmptyState title={emptyTitle} icon="⚖️" />;

  return (
    <ul className="flex flex-col gap-2">
      {drafts.map((draft) => {
        const { total } = computeReceiptTotal(draft.lines);
        return (
          <li key={draft.id}>
            <Link to={`${ROUTES.create}?draft=${draft.id}`} className="card flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">
                  {draft.supplierName || L.walkIn}
                </span>
                <span className="num block text-sm text-ink-3">
                  {draft.lines.length} {L.product.toLowerCase()} · {formatDateTime(draft.updatedAt)}
                </span>
              </span>
              <span className="num shrink-0 font-extrabold text-ink">{formatVnd(total)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
