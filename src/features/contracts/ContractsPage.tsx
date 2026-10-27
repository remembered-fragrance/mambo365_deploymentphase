import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/ui/icons';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatQuantity, formatVnd } from '@mambo/core/format';
import { contractProgress } from '@mambo/core/seasonContracts';
import type { SeasonContract } from '@mambo/core/types';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';
import { useAccess } from '../shared/useAccess';
import { useAttempt } from '../shared/useAttempt';
import { ContractFormDialog } from './ContractFormDialog';
import { draftFromContract, emptyContract, toContractInput, type ContractDraft } from './contractDraft';

const FILTER_OPTIONS = [
  { value: 'open', label: L.contractsOpen },
  { value: 'closed', label: L.contractsClosed },
];

/**
 * Hợp đồng mùa vụ (V15): hẹn lượng với nông hộ / nhà máy, app tự cộng phiếu cân vào. Không gắn phiếu vào hợp đồng —
 * tiến độ tính lại mỗi lần từ sổ (`@mambo/core/seasonContracts`), sửa, xoá phiếu là tiến độ theo ngay.
 */
export function ContractsPage() {
  const { data, addSeasonContract, updateSeasonContract, deleteSeasonContract } = useStore();
  const { can } = useAccess();
  const paid = useEntitlement('sync');
  const toast = useToast();
  const attempt = useAttempt();
  const canManage = can('partner:manage');

  const [filter, setFilter] = useState<'open' | 'closed'>('open');
  const [draft, setDraft] = useState<ContractDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SeasonContract | null>(null);

  const all = useMemo(() => data.seasonContracts ?? [], [data.seasonContracts]);
  const shown = useMemo(
    () =>
      all
        .filter((c) => (filter === 'closed') === c.closed)
        .sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [all, filter],
  );

  const save = (next: ContractDraft) => {
    const input = toContractInput(next, data);
    const id = next.id;
    if (!attempt(() => (id ? updateSeasonContract(id, input) : addSeasonContract(input)))) return;
    setDraft(null);
    toast({ message: `${L.save}: ${input.counterpartyName}` });
  };

  const toggleClosed = (c: SeasonContract) => attempt(() => updateSeasonContract(c.id, { closed: !c.closed }));

  const remove = () => {
    const c = confirmDelete;
    if (!c) return;
    if (!attempt(() => deleteSeasonContract(c.id))) return;
    setConfirmDelete(null);
    setDraft(null);
    toast({ message: `${L.del}: ${c.counterpartyName}`, tone: 'alert' });
  };

  return (
    <PageContainer width="content">
      <PageHeader
        title={L.navContracts}
        subtitle={L.contractsSubtitle}
        actions={
          canManage && paid ? (
            <Button tone="primary" onClick={() => setDraft(emptyContract())}>
              <PlusIcon className="h-4 w-4" />
              {L.addContract}
            </Button>
          ) : undefined
        }
      />

      {canManage && !paid && (
        <div className="mb-3">
          <PlanGate reason={L.gateSeason} feature="season" />
        </div>
      )}

      <div className="mb-3">
        <Segmented
          label={L.contractsFilter}
          value={filter}
          options={FILTER_OPTIONS}
          onValueChange={(value) => setFilter(value as 'open' | 'closed')}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState title={L.contractsEmpty} description={L.contractsEmptyHint} icon="🤝" />
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              progress={contractProgress(data, c)}
              onEdit={canManage ? () => setDraft(draftFromContract(c)) : undefined}
              onToggle={canManage ? () => toggleClosed(c) : undefined}
            />
          ))}
        </div>
      )}

      <ContractFormDialog
        open={draft !== null}
        initial={draft ?? emptyContract()}
        data={data}
        onSave={save}
        onDelete={draft?.id ? () => setConfirmDelete(all.find((c) => c.id === draft.id) ?? null) : undefined}
        onClose={() => setDraft(null)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title={L.contractDeleteTitle}
        consequence={confirmDelete ? `${confirmDelete.counterpartyName} · ${confirmDelete.productName}` : ''}
        confirmLabel={L.del}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageContainer>
  );
}

interface CardProps {
  readonly contract: SeasonContract;
  readonly progress: ReturnType<typeof contractProgress>;
  readonly onEdit?: () => void;
  readonly onToggle?: () => void;
}

function ContractCard({ contract: c, progress: p, onEdit, onToggle }: CardProps) {
  const qty = (n: number) => formatQuantity(n, c.unit);
  const expired = !c.closed && new Date(c.endDate).getTime() + 86_400_000 < Date.now();
  return (
    <Card
      title={c.counterpartyName}
      subtitle={`${c.kind === 'sale' ? L.contractSell : L.contractBuy} · ${c.productName}`}
      action={<span className="num shrink-0 text-lg font-extrabold text-ink">{p.percent}%</span>}
    >
      <div
        role="progressbar"
        aria-label={L.contractDelivered}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.percent}
        className="h-2 overflow-hidden rounded-full bg-rule"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${p.percent}%` }} />
      </div>
      <p className="num mt-2 text-sm text-ink">
        {L.contractDelivered} <strong>{qty(p.delivered)}</strong> / {qty(c.quantity)} · {L.contractRemaining}{' '}
        <strong>{qty(p.remaining)}</strong> · {p.receiptCount} {L.contractReceipts}
      </p>
      <p className="num mt-1 text-sm text-ink-3">
        {formatDate(c.startDate)} – {formatDate(c.endDate)}
        {c.pricePerUnit !== undefined && ` · ${formatVnd(c.pricePerUnit)}/${c.unit}`}
        {expired && <span className="font-semibold text-alert"> · {L.contractExpired}</span>}
      </p>
      {c.note && <p className="mt-1 text-sm text-ink-2">{c.note}</p>}
      {(onEdit || onToggle) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onEdit && (
            <Button onClick={onEdit}>
              {L.contractEdit}
            </Button>
          )}
          {onToggle && (
            <Button tone="quiet" onClick={onToggle}>
              {c.closed ? L.contractReopen : L.contractClose}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
