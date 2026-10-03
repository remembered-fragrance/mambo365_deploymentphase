import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/data/DataView';
import { MasterDetail } from '@/components/data/MasterDetail';
import type { SortState } from '@/components/data/dataViewModel';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { formatVnd } from '@/core/format';
import { partySummaries, partyTransactions, type PartyRole, type PartySummary } from '@/core/partySelectors';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { useWideScreen } from '../shared/useWideScreen';
import { PartnerDetail } from './PartnerDetail';
import { PartnerFormDialog, emptyParty, type PartyDraft } from './PartnerFormDialog';
import { partnerColumns } from './partnerColumns';

/**
 * Người bán và Người mua là MỘT màn hình, hai vai.
 *
 * Bản demo có hai trang gần như giống hệt nhau; sửa lỗi phải sửa hai chỗ và
 * chúng đã bắt đầu lệch. Gộp trước, tô vẽ sau (E §4.3).
 */
export function PartnerListPage({ role }: { readonly role: PartyRole }) {
  const { data, addSupplier, updateSupplier, deleteSupplier, addBuyer, updateBuyer, deleteBuyer } =
    useStore();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const wide = useWideScreen();

  const [form, setForm] = useState<PartyDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PartySummary | null>(null);
  const [sort, setSort] = useState<SortState>({ columnId: 'last', desc: true });

  const supplierSide = role === 'supplier';
  const rows = useMemo(() => partySummaries(data, role), [data, role]);

  const selectedId = params.get('doi-tac') ?? undefined;
  const selected = rows.find((p) => p.id === selectedId);

  const select = (id?: string) => {
    const merged = new URLSearchParams(params);
    if (id) merged.set('doi-tac', id);
    else merged.delete('doi-tac');
    setParams(merged, { replace: true });
  };

  const openEdit = (party: PartySummary) =>
    setForm({
      id: party.id,
      name: party.name,
      phone: party.phone ?? '',
      location: party.location ?? '',
      note: '',
    });

  const save = (draft: PartyDraft) => {
    const patch = {
      name: draft.name.trim(),
      phone: draft.phone.trim() || undefined,
      location: draft.location.trim() || undefined,
      note: draft.note.trim() || undefined,
    };
    if (draft.id) {
      if (supplierSide) updateSupplier(draft.id, patch);
      else updateBuyer(draft.id, patch);
    } else if (supplierSide) {
      addSupplier(patch);
    } else {
      addBuyer(patch);
    }
    setForm(null);
    toast({ message: `${L.save}: ${patch.name}` });
  };

  const remove = () => {
    const party = confirmDelete;
    if (!party) return;
    if (supplierSide) deleteSupplier(party.id);
    else deleteBuyer(party.id);
    setConfirmDelete(null);
    setForm(null);
    select(undefined);
    toast({ message: `${L.del}: ${party.name}`, tone: 'alert' });
  };

  // Dựng lại mỗi lần vẽ, không `useMemo`: các hàm bên trong đọc URL hiện tại,
  // mà ghi nhớ chúng thì chỉ đổi được một thứ rẻ tiền lấy một lỗi khó tìm.
  const columns = partnerColumns(role, (p) => select(p.id), openEdit);

  const list = (
    <DataView
      rows={rows}
      columns={columns}
      getKey={(p) => p.id}
      caption={supplierSide ? L.navSuppliers : L.navBuyers}
      selectedKey={selectedId}
      sort={sort}
      onSortChange={setSort}
      empty={
        <EmptyState
          title={supplierSide ? L.noSuppliers : L.noBuyers}
          description={supplierSide ? L.noSuppliersHint : L.noBuyersHint}
          icon="📇"
        />
      }
    />
  );

  const detail = selected ? (
    <PartnerDetail
      party={selected}
      role={role}
      transactions={partyTransactions(data, selected.id)}
      onEdit={() => openEdit(selected)}
    />
  ) : undefined;

  return (
    <PageContainer width="wide">
      <PageHeader
        title={supplierSide ? L.navSuppliers : L.navBuyers}
        actions={
          <>
            <HelpButton topic="partners" />
            <Button tone="primary" onClick={() => setForm(emptyParty())}>
              <PlusIcon className="h-4 w-4" />
              {supplierSide ? L.addSupplier : L.addBuyer}
            </Button>
          </>
        }
      />

      {wide ? (
        <MasterDetail
          list={list}
          detail={detail}
          detailTitle={selected?.name ?? ''}
          onCloseDetail={() => select(undefined)}
        />
      ) : (
        <>
          {list}
          <BottomSheet
            open={detail !== undefined}
            title={selected?.name ?? ''}
            onClose={() => select(undefined)}
          >
            {detail}
          </BottomSheet>
        </>
      )}

      <PartnerFormDialog
        open={form !== null}
        role={role}
        initial={form ?? emptyParty()}
        onSave={save}
        onDelete={
          form?.id
            ? () => setConfirmDelete(rows.find((p) => p.id === form.id) ?? null)
            : undefined
        }
        onClose={() => setForm(null)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title={L.deletePartyTitle}
        consequence={
          confirmDelete
            ? `${confirmDelete.name} · ${confirmDelete.txCount} ${L.receiptCountUnit} · ${formatVnd(confirmDelete.debt)} ${L.debtOf}. ${L.deletePartyKeepsReceipts}`
            : ''
        }
        confirmLabel={L.del}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageContainer>
  );
}
