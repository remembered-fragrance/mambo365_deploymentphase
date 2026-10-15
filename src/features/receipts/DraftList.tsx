import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { computeReceiptTotal } from '@mambo/core/calc';
import { formatDateTime, formatVnd } from '@mambo/core/format';
import type { DraftReceipt } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { discardConsequence, draftHref } from '../receipt/draftSessions';

interface DraftListProps {
  readonly drafts: readonly DraftReceipt[];
  readonly emptyTitle: string;
  readonly onDelete: (draftId: string) => void;
}

/**
 * Nháp mở lại bằng `draftHref` — chạm một cái là về đúng phiếu đang cân dở.
 * Nháp bỏ dở (khách bỏ đi, cân nhầm) xoá được ngay ở đây, khỏi phải mở ra; nút xoá là ô riêng
 * cạnh dòng và luôn hỏi lại, nên chạm nhầm cũng không mất gì.
 */
export function DraftList({ drafts, emptyTitle, onDelete }: DraftListProps) {
  const toast = useToast();
  const [deleting, setDeleting] = useState<DraftReceipt | null>(null);

  if (drafts.length === 0) return <EmptyState title={emptyTitle} icon="⚖️" />;

  const name = (draft: DraftReceipt) => draft.supplierName.trim() || L.walkIn;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {drafts.map((draft) => {
          const { total } = computeReceiptTotal(draft.lines);
          return (
            <li key={draft.id} className="flex items-stretch gap-2">
              <Link to={draftHref(draft)} className="card flex min-w-0 flex-1 items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{name(draft)}</span>
                  <span className="num block text-sm text-ink-3">
                    {draft.lines.length} {L.product.toLowerCase()} · {formatDateTime(draft.updatedAt)}
                  </span>
                </span>
                <span className="num shrink-0 font-extrabold text-ink">{formatVnd(total)}</span>
              </Link>
              <button
                type="button"
                aria-label={`${L.discardDraft} · ${name(draft)}`}
                onClick={() => setDeleting(draft)}
                className="card flex w-12 shrink-0 items-center justify-center text-alert"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={deleting !== null}
        title={L.discardDraftTitle}
        consequence={
          deleting ? discardConsequence(deleting.supplierName, computeReceiptTotal(deleting.lines).total) : ''
        }
        confirmLabel={L.del}
        onConfirm={() => {
          const draft = deleting;
          setDeleting(null);
          if (!draft) return;
          onDelete(draft.id);
          toast({ message: `${L.draftDiscarded} · ${name(draft)}`, tone: 'alert' });
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
