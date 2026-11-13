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
import { formatVnd } from '@mambo/core/format';
import { partiesNamed } from '@mambo/core/partyActions';
import { partySummaries, partyTransactions, type PartyRole, type PartySummary } from '@mambo/core/partySelectors';
import { useLinks } from '@/data/hooks/useLinked';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { useWideScreen } from '../shared/useWideScreen';
import { PartnerDetail } from './PartnerDetail';
import { useAccess } from '../shared/useAccess';
import { PartnerFormDialog, emptyParty, partyFromDraft, type PartyDraft } from './PartnerFormDialog';
import { LinkCodeCell } from './LinkCodeCell';
import { linkStateOf } from './linkState';
import { partnerColumns } from './partnerColumns';

/**
 * Người bán và Người mua là MỘT màn hình, hai vai.
 *
 * Bản demo có hai trang gần như giống hệt nhau; sửa lỗi phải sửa hai chỗ và
 * chúng đã bắt đầu lệch. Gộp trước, tô vẽ sau (E §4.3).
 */
export function PartnerListPage({ role }: { readonly role: PartyRole }) {
  const { can } = useAccess();
  const { data, currentOrgId, addSupplier, updateSupplier, deleteSupplier, addBuyer, updateBuyer, deleteBuyer } =
    useStore();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const wide = useWideScreen();

  const [form, setForm] = useState<PartyDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PartySummary | null>(null);
  const [sort, setSort] = useState<SortState>({ columnId: 'last', desc: true });

  const supplierSide = role === 'supplier';
  const linkable = Boolean(currentOrgId) && can('partner:manage');
  const links = useLinks(linkable);
  const rows = useMemo(() => partySummaries(data, role), [data, role]);

  const selectedId = params.get('doi-tac') ?? undefined;
  const selected = rows.find((p) => p.id === selectedId);

  const select = (id?: string) => {
    const merged = new URLSearchParams(params);
    if (id) merged.set('doi-tac', id);
    else merged.delete('doi-tac');
    setParams(merged, { replace: true });
  };

  const profiles = supplierSide ? data.suppliers : data.buyers;

  // `PartySummary` không mang ghi chú: lấy từ hồ sơ, không thì mở form sửa là ghi chú cũ biến mất (B5).
  const openEdit = (party: PartySummary) =>
    setForm({
      id: party.id,
      name: party.name,
      phone: party.phone ?? '',
      location: party.location ?? '',
      note: profiles.find((p) => p.id === party.id)?.note ?? '',
    });

  const save = (draft: PartyDraft) => {
    const patch = partyFromDraft(draft);
    try {
      if (draft.id) {
        if (supplierSide) updateSupplier(draft.id, patch);
        else updateBuyer(draft.id, patch);
      } else if (supplierSide) {
        // Bấm "Thêm" là thêm người mới, kể cả trùng tên người đã có — không âm thầm trả về người cũ (B3).
        addSupplier(patch, { asNew: true });
      } else {
        addBuyer(patch, { asNew: true });
      }
    } catch (error) {
      // Máy không nhận (`opProblem`, B4): nói ngay, form còn mở để sửa.
      toast({ message: error instanceof Error ? error.message : L.cannotSaveInvalid, tone: 'alert' });
      return;
    }
    setForm(null);
    toast({ message: `${L.save}: ${patch.name}` });
  };

  const remove = () => {
    const party = confirmDelete;
    if (!party) return;
    try {
      if (supplierSide) deleteSupplier(party.id);
      else deleteBuyer(party.id);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : L.cannotSaveInvalid, tone: 'alert' });
      return;
    }
    setConfirmDelete(null);
    setForm(null);
    select(undefined);
    toast({ message: `${L.del}: ${party.name}`, tone: 'alert' });
  };

  // Dựng lại mỗi lần vẽ, không `useMemo`: các hàm bên trong đọc URL hiện tại,
  // mà ghi nhớ chúng thì chỉ đổi được một thứ rẻ tiền lấy một lỗi khó tìm.
  const columns = partnerColumns(
    role,
    (p) => select(p.id),
    openEdit,
    linkable
      ? (p) => <LinkCodeCell state={linkStateOf(links.data ?? [], p.id)} partnerKind={role} partnerId={p.id} onChanged={links.reload} />
      : undefined,
  );

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
      onEdit={can('partner:manage') ? () => openEdit(selected) : undefined}
      links={linkable ? links : undefined}
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
        hasNamesake={(name) => partiesNamed(profiles, name).some((p) => p.id !== form?.id)}
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
