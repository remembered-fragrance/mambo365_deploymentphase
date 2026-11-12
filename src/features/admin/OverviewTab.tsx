import { useState } from 'react';
import type { AdminMonthRevenue, AdminOverview } from '@mambo/contracts';
import { formatDateTime, formatVnd } from '@mambo/core/format';
import { BarChart } from '@/components/data/BarChart';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchOverview, type FunnelState, useAdminRequest } from '@/data/hooks/useAdmin';
import { ORG_TYPE_TEXT } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';
import { FunnelCard } from './FunnelCard';

const load = () => fetchOverview();

function Stat({ label, value, detail, alert = false }: { readonly label: string; readonly value: string; readonly detail?: string; readonly alert?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-3 ${alert ? 'border-alert' : 'border-rule'}`}>
      <p className="text-sm text-ink-3">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${alert ? 'text-alert' : 'text-ink'}`}>{value}</p>
      {detail && <p className="text-xs text-ink-3">{detail}</p>}
    </div>
  );
}

const REVENUE_COLUMNS: readonly Column<AdminMonthRevenue>[] = [
  { id: 'month', header: L.adminRevenueMonth, cell: (r) => r.month.split('-').reverse().join('/'), numeric: true, mobile: 'title' },
  { id: 'count', header: L.adminRevenueCount, cell: (r) => r.count, align: 'right', numeric: true, mobile: 'secondary' },
  { id: 'amount', header: L.adminStatRevenue, cell: (r) => formatVnd(r.amount), align: 'right', numeric: true, mobile: 'value' },
];

function Numbers({ o }: { readonly o: AdminOverview }) {
  const types = (['trader', 'farmer', 'enterprise'] as const).map((t) => `${ORG_TYPE_TEXT[t].label} ${o.organizations[t]}`).join(' · ');
  const byPlan = `${L.adminPlanThuongLai} ${o.premiumByPlan.thuong_lai} · ${L.adminPlanVua} ${o.premiumByPlan.vua} · ${L.adminPlanEnterprise} ${o.premiumByPlan.enterprise}`;
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Stat label={L.adminStatOrgs} value={String(o.organizations.total)} detail={types} />
      <Stat label={L.adminStatNew} value={`${o.newOrganizations.last7Days} / ${o.newOrganizations.last30Days}`} />
      <Stat label={L.adminStatUsers} value={String(o.users)} />
      <Stat label={L.adminStatPremium} value={String(o.plans.premium)} detail={byPlan} />
      <Stat label={L.adminStatTrial} value={String(o.plans.trial)} />
      <Stat label={L.adminStatGraceFree} value={`${o.plans.grace} / ${o.plans.free}`} />
      <Stat label={L.adminStatExpiring} value={String(o.expiringSoon)} alert={o.expiringSoon > 0} />
      <Stat label={L.adminStatRevenue} value={formatVnd(o.revenue.total)} />
      <Stat label={L.adminStatRevenue30} value={formatVnd(o.revenue.last30Days)} />
      <Stat label={L.adminStatNeedsReview} value={String(o.payments.needsReview)} alert={o.payments.needsReview > 0} />
      <Stat label={L.adminStatPending} value={String(o.payments.pendingIntents)} />
      <Stat
        label={L.adminStatFeedback}
        value={`${o.feedback.count} · ${o.feedback.averageRating === null ? '—' : o.feedback.averageRating.toFixed(1).replace('.', ',')}`}
      />
    </div>
  );
}

interface OverviewTabProps {
  readonly funnel: FunnelState;
  readonly days: number;
  readonly onDaysChange: (days: number) => void;
}

/** Tab "Tổng quan": số liệu chung (máy chủ không ghi nhật ký) + phễu đo lường. */
export function OverviewTab({ funnel, days, onDaysChange }: OverviewTabProps) {
  const [request, setRequest] = useState<object>({});
  const overview = useAdminRequest(request, load);
  const o = overview.data;

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={L.adminOverviewTitle}
        subtitle={o ? `${L.adminOverviewAt} ${formatDateTime(o.generatedAt)}` : undefined}
        action={
          <Button onClick={() => setRequest({})} disabled={overview.loading}>
            {L.adminRefresh}
          </Button>
        }
      >
        {overview.error && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {overview.error}
          </p>
        )}
        {!o && !overview.error && <Skeleton rows={3} label={L.loading} />}
        {o && <Numbers o={o} />}
      </Card>
      {o && (
        <Card title={L.adminSignupsTitle}>
          <BarChart
            caption={L.adminSignupsTitle}
            points={o.signupsByDay.map((d, i) => ({
              label: d.date.slice(8),
              value: d.count,
              display: String(d.count),
              highlight: i === o.signupsByDay.length - 1,
            }))}
          />
        </Card>
      )}
      {o && (
        <Card title={L.adminRevenueTitle}>
          <DataView
            rows={[...o.revenue.byMonth].reverse()}
            columns={REVENUE_COLUMNS}
            getKey={(r) => r.month}
            caption={L.adminRevenueTitle}
            empty={<p className="text-sm text-ink-3">{L.adminRevenueEmpty}</p>}
          />
        </Card>
      )}
      <FunnelCard funnel={funnel} days={days} onDaysChange={onDaysChange} />
    </div>
  );
}
