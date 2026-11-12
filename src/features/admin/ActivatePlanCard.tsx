import { useState } from 'react';
import { EXTRA_STAFF_MAX, type AdminActivatePlanInput, type AdminActivatePlanResult, type PlanCode } from '@mambo/contracts';
import { formatDate, formatVnd } from '@mambo/core/format';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  activateInput,
  activatePlan,
  adminErrorMessage,
  ownedOrganizations,
  type ActivateDraft,
} from '@/data/hooks/useAdmin';
import { PLAN_NAME } from '@/features/billing/planText';
import { parseMoney } from '@/features/shared/money';
import { NumberField } from '@/features/shared/NumberField';
import { orgTypeText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';

const EMPTY = {
  target: '',
  plan: '' as PlanCode | '',
  months: '',
  extraStaff: '',
  amount: '',
  bankTxId: '',
  approvedBy: '',
  reason: '',
};

type Errors = Partial<Record<keyof ActivateDraft, string>>;

// Gói và người cân thêm là ô chọn — không gõ sai được.
const FIELD_ERROR: Errors = {
  target: L.adminErrTarget,
  months: L.adminErrMonths,
  amount: L.adminErrAmount,
  bankTxId: L.adminErrBankTxId,
  approvedBy: L.adminErrApprovedBy,
  reason: L.adminErrReason,
};

const PLAN_OPTIONS = [
  { value: '', label: L.adminPlanKeep },
  { value: 'thuong_lai', label: PLAN_NAME.thuong_lai },
  { value: 'vua', label: PLAN_NAME.vua },
];

const EXTRA_STAFF_OPTIONS = [
  { value: '', label: L.adminKeep },
  ...Array.from({ length: EXTRA_STAFF_MAX + 1 }, (_, n) => ({ value: String(n), label: String(n) })),
];

interface PickedOrg {
  readonly id: string;
  readonly name: string;
}

/** Hộp xác nhận ghi rõ mở cho AI, gói gì, bao lâu, bao nhiêu tiền — thứ người duyệt phải đọc lại trước khi bấm. */
const summary = (input: AdminActivatePlanInput, picked: PickedOrg | null): string =>
  [
    input.organizationId
      ? `${L.adminConfirmOrg} ${input.organizationId}${picked?.id === input.organizationId ? ` (${picked.name})` : ''}`
      : `${L.adminConfirmOwner} ${input.ownerPhone ?? ''}`,
    input.plan ? PLAN_NAME[input.plan] : L.adminPlanKeep,
    input.extraStaff === undefined ? '' : `${L.payExtraStaffPrefix} ${input.extraStaff} ${L.payExtraStaffSuffix}`,
    `${input.months} ${L.adminMonthsUnit}`,
    formatVnd(input.amount),
    `${L.adminBankTxId} ${input.bankTxId}`,
    `${L.adminApprovedBy}: ${input.approvedBy}`,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Mở / gia hạn gói bằng tay (`POST /v1/admin/plans/activate`) — khi khách chuyển khoản sai nội dung hoặc thiếu
 * tiền nên gói không tự mở. Máy chủ không có API tra tổ chức, nên trước khi bấm chỉ biết số điện thoại / mã đã gõ;
 * tên tổ chức, gói và ngày hết hạn hiện ra SAU khi máy chủ trả lời. Cùng mã giao dịch bấm lại không cộng thêm kỳ.
 */
export function ActivatePlanCard({ initialTarget = '' }: { readonly initialTarget?: string }) {
  // Mở từ trang chi tiết tổ chức: điền sẵn mã tổ chức (nơi dùng đổi `key` để dựng lại form).
  const [form, setForm] = useState({ ...EMPTY, target: initialTarget });
  const [errors, setErrors] = useState<Errors>({});
  const [picked, setPicked] = useState<PickedOrg | null>(null);
  const [pending, setPending] = useState<AdminActivatePlanInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [result, setResult] = useState<AdminActivatePlanResult | null>(null);

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const organizations = ownedOrganizations(failure);

  const ask = () => {
    const checked = activateInput({
      ...form,
      months: Number.parseInt(form.months, 10),
      extraStaff: form.extraStaff === '' ? null : Number.parseInt(form.extraStaff, 10),
      // Ô trống không phải 0 đồng: quên gõ số tiền thì báo, không lặng lẽ ghi 0.
      amount: form.amount.trim() === '' ? Number.NaN : parseMoney(form.amount),
    });
    setFailure(null);
    if ('invalid' in checked) {
      setErrors(Object.fromEntries(checked.invalid.map((field) => [field, FIELD_ERROR[field]])));
      return;
    }
    setErrors({});
    setPending(checked.input);
  };

  const run = async () => {
    if (!pending) return;
    const input = pending;
    setPending(null);
    setBusy(true);
    setResult(null);
    try {
      setResult(await activatePlan(input));
      // Giữ tên người duyệt cho lần mở kế tiếp; phần còn lại xoá để không bấm nhầm lần hai.
      setForm((f) => ({ ...EMPTY, approvedBy: f.approvedBy }));
      setPicked(null);
    } catch (err) {
      setFailure(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={L.adminActivateTitle} subtitle={L.adminActivateHint}>
      <div className="flex flex-col gap-3">
        <Input
          label={L.adminTarget}
          hint={L.adminTargetHint}
          error={errors.target}
          value={form.target}
          autoComplete="off"
          onChange={(e) => set('target')(e.target.value)}
        />
        <Select
          label={L.adminPlan}
          value={form.plan}
          options={PLAN_OPTIONS}
          hint={L.adminPlanHint}
          onValueChange={set('plan')}
        />
        {form.plan === 'vua' && (
          <Select
            label={L.adminExtraStaff}
            value={form.extraStaff}
            options={EXTRA_STAFF_OPTIONS}
            onValueChange={set('extraStaff')}
          />
        )}
        <Input
          label={L.adminMonths}
          error={errors.months}
          type="number"
          inputMode="numeric"
          min={1}
          max={36}
          value={form.months}
          onChange={(e) => set('months')(e.target.value)}
        />
        <NumberField
          label={L.adminAmount}
          value={form.amount}
          onValueChange={set('amount')}
          unit="₫"
          error={errors.amount}
          money
          spoken
        />
        <Input
          label={L.adminBankTxId}
          hint={L.adminBankTxIdHint}
          error={errors.bankTxId}
          value={form.bankTxId}
          autoComplete="off"
          onChange={(e) => set('bankTxId')(e.target.value)}
        />
        <Input
          label={L.adminApprovedBy}
          hint={L.adminApprovedByHint}
          error={errors.approvedBy}
          value={form.approvedBy}
          onChange={(e) => set('approvedBy')(e.target.value)}
        />
        <Input
          label={L.adminReason}
          error={errors.reason}
          value={form.reason}
          onChange={(e) => set('reason')(e.target.value)}
        />

        {failure !== null && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {adminErrorMessage(failure)}
          </p>
        )}
        {organizations.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink-2">{L.adminPickOrg}</p>
            {organizations.map((org) => (
              <Button
                key={org.id}
                block
                onClick={() => {
                  set('target')(org.id);
                  setPicked(org);
                  setFailure(null);
                }}
              >
                {org.name}
              </Button>
            ))}
          </div>
        )}

        <Button tone="primary" size="lg" block disabled={busy} onClick={ask}>
          {busy ? L.loading : L.adminActivateSubmit}
        </Button>

        {result && (
          <div role="status" className="flex flex-col gap-1 rounded-xl border border-brand bg-paper p-3 text-sm text-ink">
            <p className="font-bold">{L.adminActivatedTitle}</p>
            {result.alreadyProcessed && <p className="text-ink-2">{L.adminAlreadyProcessed}</p>}
            <p>
              {L.adminResultOrg}: <b>{result.organization.name}</b> · {orgTypeText(result.organization.type, result.plan.plan)}
            </p>
            <p>
              {L.planEndsOn}: <b className="num">{result.plan.periodEnd ? formatDate(result.plan.periodEnd) : L.adminResultNoEnd}</b>
            </p>
            {result.plan.staffLimit !== null && (
              <p>
                {L.featureStaff}: <b className="num">{result.plan.staffLimit}</b>
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={L.adminActivateConfirmTitle}
        consequence={pending ? summary(pending, picked) : ''}
        confirmLabel={L.adminActivateSubmit}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}
