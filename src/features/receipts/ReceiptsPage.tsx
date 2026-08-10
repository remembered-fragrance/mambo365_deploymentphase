import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/data/DataView';
import { MasterDetail } from '@/components/data/MasterDetail';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Segmented } from '@/components/ui/Segmented';
import { FilterIcon } from '@/components/ui/icons';
import { transactionTotals } from '@/core/calc';
import type { HistoryFilters, PaymentFilter, TimePeriod } from '@/core/filters';
import { formatVnd, formatWeight } from '@/core/format';
import type { Transaction } from '@/core/types';
import { useStore } from '@/data/useStore';
import { useTransactionList } from '@/data/hooks/useTransactionList';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { ROUTES } from '../shared/navItems';
import { useWideScreen } from '../shared/useWideScreen';
import { ReceiptVoucher } from '../receiptDetail/ReceiptVoucher';
import { DraftList } from './DraftList';
import { ReceiptFilterSheet } from './ReceiptFilterSheet';
import { receiptColumns } from './receiptColumns';

type Tab = 'done' | 'draft' | 'waiting';

const KIND_OPTIONS = [
  { value: 'purchase', label: L.purchase },
  { value: 'sale', label: L.sale },
  { value: 'all', label: L.filterAll },
];

/**
 * Ô tích chọn phiếu để xuất — chỉ có ở dạng bảng. Trên thẻ mobile, một chạm là
 * mở phiếu; thêm ô tích vào đó chỉ làm chạm nhầm.
 */
function SelectCell({
  checked,
  label,
  onToggle,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onToggle: (on: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onToggle(e.target.checked)}
      className="h-5 w-5 accent-[var(--color-brand)]"
    />
  );
}

const selectionColumn = (
  selected: readonly string[],
  onToggle: (txId: string, on: boolean) => void,
): Column<Transaction> => ({
  id: 'select',
  header: '',
  mobile: 'hidden',
  cell: (tx) => (
    <SelectCell
      checked={selected.includes(tx.id)}
      label={`${L.selectedCount}: ${tx.supplierName}`}
      onToggle={(on) => onToggle(tx.id, on)}
    />
  ),
});

export function ReceiptsPage() {
  const { data, user } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const wide = useWideScreen();

  const tab = (params.get('tab') as Tab | null) ?? 'done';
  const previewId = params.get('xem');
  const preview = wide ? data.transactions.find((t) => t.id === previewId) : undefined;

  const filters = useMemo<HistoryFilters>(
    () => ({
      period: (params.get('period') as TimePeriod | null) ?? 'all',
      payment: (params.get('payment') as PaymentFilter | null) ?? 'all',
      kind: (params.get('kind') as HistoryFilters['kind']) ?? 'purchase',
    }),
    [params],
  );

  const { rows, total, loadMore, hasMore } = useTransactionList(filters);
  const columns = useMemo(() => receiptColumns(), []);

  const toggleSelected = (txId: string, on: boolean) =>
    setSelected((cur) => (on ? [...cur, txId] : cur.filter((id) => id !== txId)));

  const drafts = data.drafts.filter((d) => d.status === 'draft');
  const waiting = data.drafts.filter((d) => d.status === 'waiting');

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, tx) => {
          const t = transactionTotals(tx);
          return { weight: acc.weight + t.netWeight, money: acc.money + t.total };
        },
        { weight: 0, money: 0 },
      ),
    [rows],
  );

  const patch = (next: Partial<HistoryFilters & { tab: Tab; xem: string }>) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) merged.delete(key);
      else merged.set(key, String(value));
    }
    setParams(merged, { replace: true });
  };

  const exportSelected = async () => {
    const chosen = data.transactions.filter((t) => selected.includes(t.id));
    const { exportTransactionsXlsx } = await import('@/export/transactionsFile');
    await exportTransactionsXlsx(chosen, 'thumua365-phieu.xlsx');
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title={L.navReceipts}
        actions={
          <>
            <HelpButton topic="receipts" />
            <Button className="lg:hidden" onClick={() => setFilterOpen(true)}>
              <FilterIcon className="h-4 w-4" />
              {L.filterButton}
            </Button>
            {selected.length > 0 && (
              <Button tone="primary" onClick={exportSelected}>
                {L.exportSelected} ({selected.length})
              </Button>
            )}
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip label={L.tabDone} selected={tab === 'done'} onSelect={() => patch({ tab: 'done' })} />
        <Chip
          label={`${L.draftWeighing} (${drafts.length})`}
          selected={tab === 'draft'}
          onSelect={() => patch({ tab: 'draft' })}
        />
        <Chip
          label={`${L.draftSaved} (${waiting.length})`}
          selected={tab === 'waiting'}
          onSelect={() => patch({ tab: 'waiting' })}
        />
        {tab === 'done' && (
          <div className="ml-auto">
            <Segmented
              label={L.filterKind}
              value={filters.kind ?? 'purchase'}
              options={KIND_OPTIONS}
              onValueChange={(kind) => patch({ kind: kind as HistoryFilters['kind'] })}
            />
          </div>
        )}
      </div>

      {tab === 'draft' && <DraftList drafts={drafts} emptyTitle={L.noReceipts} />}
      {tab === 'waiting' && <DraftList drafts={waiting} emptyTitle={L.noReceipts} />}

      {tab === 'done' && (
        <MasterDetail
          list={
            <>
              {/* Dòng đối soát — dính khi cuộn, vì đây là con số người dùng cộng
                  lại để so với sổ giấy. */}
              <p className="num sticky top-14 z-10 mb-2 rounded-lg border border-rule bg-card px-3 py-2 text-sm font-semibold text-ink-2 lg:top-16">
                {total} {L.receiptsCount} · {formatWeight(totals.weight)} ·{' '}
                {formatVnd(totals.money)}
              </p>

              <DataView
                rows={rows}
                columns={[selectionColumn(selected, toggleSelected), ...columns]}
                getKey={(tx) => tx.id}
                caption={L.history}
                selectedKey={preview?.id}
                // Màn rộng: xem ngay ở pane bên phải. Màn hẹp: mở trang riêng.
                onRowClick={(tx) =>
                  wide ? patch({ xem: tx.id }) : navigate(ROUTES.receiptDetail(tx.id))
                }
                empty={<EmptyState title={L.noReceipts} description={L.noReceiptsHint} icon="🧾" />}
              />

              {hasMore && (
                <div className="mt-3 flex justify-center">
                  <Button onClick={loadMore}>{L.loadMore}</Button>
                </div>
              )}
            </>
          }
          detail={
            preview && (
              <div className="flex flex-col gap-3">
                <ReceiptVoucher tx={preview} businessName={user?.businessName || L.businessNameFallback} />
                <Button onClick={() => navigate(ROUTES.receiptDetail(preview.id))}>
                  {L.receiptNumber}
                </Button>
              </div>
            )
          }
          detailTitle={preview?.supplierName ?? ''}
          onCloseDetail={() => patch({ xem: undefined })}
        />
      )}

      <ReceiptFilterSheet
        open={filterOpen}
        filters={filters}
        onChange={patch}
        onClose={() => setFilterOpen(false)}
      />
    </PageContainer>
  );
}
