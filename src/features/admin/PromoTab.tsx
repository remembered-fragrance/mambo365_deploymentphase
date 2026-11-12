import { useState } from 'react';
import { type AdminPromoCreateInput, type AdminPromoRow, PlanCode } from '@mambo/contracts';
import { formatDate, formatVnd } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  adminErrorMessage,
  createPromoCode,
  deletePromoCode,
  fetchPromoCodes,
  type PromoDraft,
  promoInput,
  useAdminRequest,
} from '@/data/hooks/useAdmin';
import { parseMoney } from '@/features/shared/money';
import { NumberField } from '@/features/shared/NumberField';
import { L } from '@/i18n/labels';
import { planCodeText } from './adminText';

const load = () => fetchPromoCodes();

const PLAN_OPTIONS = PlanCode.options.map((p) => ({ value: p, label: planCodeText(p) }));

const EMPTY = { code: '', plan: 'thuong_lai' as PlanCode, monthlyAmount: '', periods: '12', note: '', approvedBy: '' };

type Errors = Partial<Record<keyof PromoDraft, string>>;

const FIELD_ERROR: Readonly<Record<keyof PromoDraft, string>> = {
  code: L.adminErrPromoCode,
  plan: L.adminErrPromoCode,
  monthlyAmount: L.adminErrPromoMonthly,
  periods: L.adminErrPromoPeriods,
  note: L.adminErrPromoNote,
  approvedBy: L.adminErrApprovedBy,
};

const promoColumns = (busy: boolean, onDelete: (code: string) => void): readonly Column<AdminPromoRow>[] => [
  { id: 'code', header: L.adminPromoCode, cell: (r) => r.code, numeric: true, mobile: 'title' },
  { id: 'plan', header: L.adminPromoPlan, cell: (r) => planCodeText(r.plan), mobile: 'hidden' },
  { id: 'monthly', header: L.adminPromoMonthly, cell: (r) => formatVnd(r.monthlyAmount), align: 'right', numeric: true, mobile: 'hidden' },
  { id: 'used', header: L.adminPromoUsed, cell: (r) => `${r.periodsUsed}/${r.periods}`, align: 'right', numeric: true, mobile: 'value' },
  {
    id: 'org',
    header: L.adminPromoOrg,
    cell: (r) => (r.organization ? `${r.organization.name}${r.redeemedAt ? ` · ${formatDate(r.redeemedAt)}` : ''}` : L.adminPromoUnused),
    mobile: 'secondary',
  },
  { id: 'note', header: L.adminPromoNote, cell: (r) => r.note ?? '—', mobile: 'hidden' },
  {
    id: 'actions',
    header: '',
    cell: (r) =>
      r.organization ? null : (
        <Button tone="danger" disabled={busy} onClick={() => onDelete(r.code)}>
          {L.adminPromoDelete}
        </Button>
      ),
    mobile: 'hidden',
  },
];

/**
 * Tab "Mã sáng lập": xem mọi mã (không ghi nhật ký), thêm mã, xoá mã chưa ai dùng. Thêm / xoá cần người duyệt và
 * ghi nhật ký quản trị; câu từ chối của máy chủ (mã trùng, mã đã dùng) hiện nguyên văn.
 */
export function PromoTab() {
  const [request, setRequest] = useState<object>({});
  const list = useAdminRequest(request, load);
  const [rows, setRows] = useState<readonly AdminPromoRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [pendingCreate, setPendingCreate] = useState<AdminPromoCreateInput | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const shown = rows ?? list.data?.rows ?? [];
  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const askCreate = () => {
    setFailure(null);
    setCreated(null);
    const checked = promoInput({
      ...form,
      monthlyAmount: form.monthlyAmount.trim() === '' ? Number.NaN : parseMoney(form.monthlyAmount),
      periods: Number.parseInt(form.periods, 10),
    });
    if ('invalid' in checked) {
      setErrors(Object.fromEntries(checked.invalid.map((field) => [field, FIELD_ERROR[field]])));
      return;
    }
    setErrors({});
    setPendingCreate(checked.input);
  };

  const askDelete = (code: string) => {
    setFailure(null);
    const name = form.approvedBy.trim();
    if (name.length < 2 || name.length > 80) {
      setErrors({ approvedBy: L.adminErrApprovedBy });
      return;
    }
    setErrors({});
    setPendingDelete(code);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (err) {
      setFailure(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    const input = pendingCreate;
    setPendingCreate(null);
    if (!input) return;
    void run(async () => {
      const row = await createPromoCode(input);
      setRows([row, ...shown]);
      setCreated(row.code);
      setForm((f) => ({ ...EMPTY, plan: f.plan, monthlyAmount: f.monthlyAmount, periods: f.periods, approvedBy: f.approvedBy }));
    });
  };

  const remove = () => {
    const code = pendingDelete;
    setPendingDelete(null);
    if (!code) return;
    void run(async () => setRows((await deletePromoCode(code, form.approvedBy.trim())).rows));
  };

  const columns = promoColumns(busy, askDelete);

  return (
    <div className="flex flex-col gap-4">
      <Card title={L.adminPromoCreateTitle} subtitle={L.adminPromoCreateHint}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            askCreate();
          }}
        >
          <Input label={L.adminPromoCode} value={form.code} maxLength={32} error={errors.code} onChange={(e) => set('code')(e.target.value)} />
          <Select label={L.adminPromoPlan} value={form.plan} options={PLAN_OPTIONS} onValueChange={set('plan')} />
          <NumberField
            label={L.adminPromoMonthly}
            value={form.monthlyAmount}
            onValueChange={set('monthlyAmount')}
            unit="₫"
            error={errors.monthlyAmount}
            money
          />
          <Input
            label={L.adminPromoPeriods}
            inputMode="numeric"
            value={form.periods}
            error={errors.periods}
            onChange={(e) => set('periods')(e.target.value)}
          />
          <Input label={L.adminPromoNote} value={form.note} maxLength={200} error={errors.note} onChange={(e) => set('note')(e.target.value)} />
          <Input
            label={L.adminApprovedBy}
            hint={L.adminApprovedByHint}
            value={form.approvedBy}
            maxLength={80}
            error={errors.approvedBy}
            onChange={(e) => set('approvedBy')(e.target.value)}
          />
          <Button type="submit" tone="primary" disabled={busy}>
            {L.adminPromoCreate}
          </Button>
        </form>
        {created && (
          <p role="status" className="mt-3 rounded-xl border border-in bg-card p-3 text-sm font-medium text-in">
            {`${L.adminPromoCreated}: ${created}`}
          </p>
        )}
        {failure && (
          <p role="alert" className="mt-3 rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {failure}
          </p>
        )}
      </Card>
      <Card
        title={L.adminPromoTitle}
        subtitle={L.adminPromoHint}
        action={
          <Button
            onClick={() => {
              setRows(null);
              setRequest({});
            }}
            disabled={list.loading}
          >
            {L.adminRefresh}
          </Button>
        }
      >
        {list.error && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {list.error}
          </p>
        )}
        <DataView
          rows={shown}
          columns={columns}
          getKey={(r) => r.code}
          caption={L.adminPromoTitle}
          empty={<p className="text-sm text-ink-3">{list.loading ? L.loading : L.adminPromoEmpty}</p>}
        />
      </Card>
      <ConfirmDialog
        open={pendingCreate !== null}
        title={L.adminPromoCreateTitle}
        consequence={
          pendingCreate
            ? `${pendingCreate.code} · ${planCodeText(pendingCreate.plan)} · ${formatVnd(pendingCreate.monthlyAmount)} × ${pendingCreate.periods}`
            : ''
        }
        confirmLabel={L.adminPromoCreate}
        onConfirm={create}
        onCancel={() => setPendingCreate(null)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title={L.adminPromoDeleteTitle}
        consequence={pendingDelete ? `${L.adminPromoCode} ${pendingDelete} ${L.adminPromoDeleteSuffix}` : ''}
        confirmLabel={L.adminPromoDelete}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
