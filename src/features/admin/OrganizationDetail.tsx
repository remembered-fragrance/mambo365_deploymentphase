import { useState } from 'react';
import { type AdminOrganizationMember, Feature } from '@mambo/contracts';
import { formatDate, formatDateTime, formatVnd } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminErrorMessage, fetchOrganization, setOrganizationFeature, useAdminRequest } from '@/data/hooks/useAdmin';
import { ORG_TYPE_TEXT, roleText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';
import { FEATURE_TEXT, MEMBER_STATUS_TEXT, phoneText, planCodeText, planText } from './adminText';
import { PAYMENT_COLUMNS } from './PaymentsCard';

interface Props {
  readonly id: string;
  readonly onClose: () => void;
  readonly onActivate: (organizationId: string) => void;
}

interface Toggle {
  readonly feature: Feature;
  readonly enabled: boolean;
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="m-0 font-semibold text-ink">{value}</dd>
    </div>
  );
}

/**
 * Chi tiết một tổ chức (`GET /v1/admin/organizations/:id` — ghi nhật ký `view-organization`). Bật / tắt cờ tính năng
 * cần người duyệt và qua hộp xác nhận; mở gói tay chuyển sang tab Thanh toán với mã tổ chức điền sẵn.
 */
export function OrganizationDetail({ id, onClose, onActivate }: Props) {
  // Chuỗi id không đổi trong suốt vòng đời (nơi dùng đặt `key={id}`) → đúng một lời gọi.
  const detail = useAdminRequest(id, fetchOrganization);
  const [features, setFeatures] = useState<readonly Feature[] | null>(null);
  const [approvedBy, setApprovedBy] = useState('');
  const [approvedError, setApprovedError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<Toggle | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const d = detail.data;
  const on = features ?? d?.features ?? [];

  const ask = (toggle: Toggle) => {
    setFailure(null);
    const name = approvedBy.trim();
    if (name.length < 2 || name.length > 80) {
      setApprovedError(L.adminErrApprovedBy);
      return;
    }
    setApprovedError(undefined);
    setPending(toggle);
  };

  const run = async () => {
    if (!pending) return;
    const toggle = pending;
    setPending(null);
    setBusy(true);
    try {
      const res = await setOrganizationFeature(id, { feature: toggle.feature, enabled: toggle.enabled, approvedBy: approvedBy.trim() });
      setFeatures(res.features);
    } catch (err) {
      setFailure(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const memberColumns: readonly Column<AdminOrganizationMember>[] = d
    ? [
        { id: 'name', header: L.adminColName, cell: (m) => m.name ?? '—', mobile: 'title' },
        { id: 'phone', header: L.adminColPhone, cell: (m) => phoneText(m.phone), numeric: true, mobile: 'secondary' },
        { id: 'username', header: L.adminColUsername, cell: (m) => m.username ?? '—', mobile: 'hidden' },
        { id: 'role', header: L.adminColRole, cell: (m) => roleText(d.type, m.role), mobile: 'value' },
        { id: 'status', header: L.adminColStatus, cell: (m) => MEMBER_STATUS_TEXT[m.status], mobile: 'secondary' },
        { id: 'branch', header: L.adminColBranch, cell: (m) => m.branch ?? '—', mobile: 'hidden' },
        { id: 'joined', header: L.adminColCreated, cell: (m) => formatDate(m.joinedAt), numeric: true, mobile: 'hidden' },
      ]
    : [];

  return (
    <Card title={d?.name ?? L.adminDetailTitle} subtitle={d ? ORG_TYPE_TEXT[d.type].label : undefined} action={<Button onClick={onClose}>{L.adminBackToList}</Button>}>
      {detail.error && (
        <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
          {detail.error}
        </p>
      )}
      {!d && !detail.error && <Skeleton rows={4} label={L.loading} />}
      {d && (
        <div className="flex flex-col gap-5">
          <dl className="m-0 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Fact label={L.adminDetailId} value={d.id} />
            <Fact label={L.adminColCreated} value={formatDate(d.createdAt)} />
            <Fact label={L.adminColPhone} value={phoneText(d.phone)} />
            <Fact label={L.adminDetailAddress} value={d.address ?? '—'} />
            <Fact label={L.adminDetailPlan} value={planText(d.plan)} />
            {d.subscription && d.type === 'trader' && <Fact label={L.adminDetailExtraStaff} value={String(d.subscription.extraStaff)} />}
            {d.subscription && d.type === 'enterprise' && (
              <Fact label={L.adminDetailBranchLimit} value={d.subscription.branchLimit === null ? '—' : String(d.subscription.branchLimit)} />
            )}
            <Fact
              label={L.adminDetailPromo}
              value={
                d.promo
                  ? `${d.promo.code} · ${planCodeText(d.promo.plan)} · ${formatVnd(d.promo.monthlyAmount)} · ${L.adminPromoUsed} ${d.promo.periodsUsed}/${d.promo.periods}`
                  : L.adminDetailNoPromo
              }
            />
          </dl>

          {d.type !== 'farmer' && (
            <div>
              <Button tone="primary" onClick={() => onActivate(d.id)}>
                {L.adminActivateForOrg}
              </Button>
            </div>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-ink">{L.adminDetailUsage}</h3>
            <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-3">
              <Fact label={L.adminUsageTransactions} value={String(d.usage.transactions)} />
              <Fact label={L.adminUsageSuppliers} value={String(d.usage.suppliers)} />
              <Fact label={L.adminUsageBuyers} value={String(d.usage.buyers)} />
              <Fact label={L.adminUsageProducts} value={String(d.usage.products)} />
              <Fact label={L.adminUsageOrders} value={String(d.usage.orders)} />
              <Fact label={L.adminUsageLast} value={d.usage.lastActivityAt ? formatDateTime(d.usage.lastActivityAt) : L.adminUsageNever} />
            </dl>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-ink">{L.adminMembersTitle}</h3>
            <DataView rows={d.members} columns={memberColumns} getKey={(m) => m.userId} caption={L.adminMembersTitle} />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-ink">{L.adminFeaturesTitle}</h3>
            <p className="text-sm text-ink-3">{L.adminFeaturesHint}</p>
            <Input
              label={L.adminApprovedBy}
              hint={L.adminApprovedByHint}
              value={approvedBy}
              maxLength={80}
              error={approvedError}
              onChange={(e) => setApprovedBy(e.target.value)}
            />
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {Feature.options.map((feature) => {
                const enabled = on.includes(feature);
                return (
                  <li key={feature} className="flex items-center justify-between gap-3 rounded-xl border border-rule bg-card p-3">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      {FEATURE_TEXT[feature]}
                      <Badge label={enabled ? L.adminFeatureOn : L.adminFeatureOff} tone={enabled ? 'in' : 'neutral'} mark={enabled ? '✓' : '–'} />
                    </span>
                    <Button tone={enabled ? 'danger' : 'quiet'} disabled={busy} onClick={() => ask({ feature, enabled: !enabled })}>
                      {enabled ? L.adminFeatureDisable : L.adminFeatureEnable}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {failure && (
              <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
                {failure}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-ink">{L.adminDetailPayments}</h3>
            <DataView
              rows={d.payments}
              columns={PAYMENT_COLUMNS.filter((c) => c.id !== 'org')}
              getKey={(r) => `${r.intent?.id ?? ''}/${r.bank?.bankTxId ?? ''}`}
              caption={L.adminDetailPayments}
              empty={<p className="text-sm text-ink-3">{L.adminPaymentsEmpty}</p>}
            />
          </section>
        </div>
      )}
      <ConfirmDialog
        open={pending !== null}
        title={L.adminFeatureConfirmTitle}
        consequence={
          pending && d
            ? `${pending.enabled ? L.adminFeatureEnable : L.adminFeatureDisable} "${FEATURE_TEXT[pending.feature]}" ${L.adminFeatureFor} ${d.name}.`
            : ''
        }
        confirmLabel={pending?.enabled ? L.adminFeatureEnable : L.adminFeatureDisable}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}
