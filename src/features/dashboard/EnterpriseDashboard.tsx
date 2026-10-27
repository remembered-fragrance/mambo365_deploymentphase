import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatVnd, formatWeight } from '@mambo/core/format';
import { useDashboardData } from '@/data/hooks/useDashboardData';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { DashboardHeader } from './DashboardHeader';

export function EnterpriseDashboard() {
  const { permissions, currentOrg, userRole } = useStore();
  const { orders, reportSummary, loading, error, refresh } = useDashboardData();
  const canSeeReports = permissions.includes('report:view');
  const canManageBranches = permissions.includes('branch:manage');
  const canManageStaff = permissions.includes('staff:manage');
  const branchId = currentOrg?.branch?.id;
  const summary = useMemo(() => {
    if (!reportSummary) return null;
    if (!branchId) return reportSummary;
    const branch = reportSummary.branches.find((item) => item.branch?.id === branchId);
    return branch ? { ...reportSummary, totals: branch.figures } : null;
  }, [branchId, reportSummary]);
  const openOrders = orders.filter((order) => ['submitted', 'accepted', 'scheduled'].includes(order.status));

  return (
    <PageContainer width="wide">
      <DashboardHeader />
      {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm"><span>{L.dashboardLoadError}</span><button className="font-bold text-brand underline" onClick={refresh}>{L.dashboardRetry}</button></div>}
      {loading && <p className="mb-3 text-sm text-ink-3" aria-live="polite">{L.loading}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {canSeeReports && summary ? (
          <>
            <Kpi label={L.enterprisePurchaseTotal} amount={summary.totals.purchase.amount} count={summary.totals.purchase.count} weight={summary.totals.purchase.netWeight} />
            <Kpi label={L.enterpriseSalesTotal} amount={summary.totals.sale.amount} count={summary.totals.sale.count} weight={summary.totals.sale.netWeight} />
            <section className="card p-5 lg:col-span-4"><p className="text-sm font-semibold text-ink-3">{L.enterpriseOutstanding}</p><p className="num mt-2 text-2xl font-extrabold text-brand">{formatVnd(summary.totals.purchase.debt + summary.totals.sale.debt)}</p><p className="mt-1 text-xs text-ink-3">{L.enterpriseDebtHint}</p></section>
          </>
        ) : canSeeReports ? <div className="lg:col-span-12"><EmptyState title={L.enterpriseNoReport} description={L.enterpriseNoReportHint} icon="📊" /></div> : null}

        {canManageBranches && (
          <div className="lg:col-span-12"><Card title={L.enterpriseBranches} subtitle={L.enterpriseBranchReportHint}>
            {!reportSummary?.branches.length ? <p className="text-sm text-ink-3">{L.enterpriseNoBranches}</p> : (
              <ul className="divide-y divide-rule">{reportSummary.branches.map((item, index) => <li key={item.branch?.id ?? `unassigned-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="font-bold text-ink">{item.branch?.name ?? L.enterpriseUnassignedBranch}</p><p className="text-xs text-ink-3">{item.figures.purchase.count + item.figures.sale.count} {L.receiptsCount}</p></div><div className="text-right text-sm"><p>{L.enterprisePurchaseTotal}: <b className="num">{formatVnd(item.figures.purchase.amount)}</b></p><p>{L.enterpriseSalesTotal}: <b className="num">{formatVnd(item.figures.sale.amount)}</b></p></div></li>)}</ul>
            )}
          </Card></div>
        )}

        <div className="lg:col-span-12"><Card title={L.enterpriseOrders}>
          {openOrders.length === 0 ? <p className="text-sm text-ink-3">{L.enterpriseNoOrders}</p> : <ul className="divide-y divide-rule">{openOrders.slice(0, 6).map((order) => <li key={order.id} className="flex flex-wrap justify-between gap-2 py-3"><div><p className="font-bold text-ink">{order.counterpart?.name ?? order.partnerName ?? L.farmerUnknownPartner}</p><p className="text-sm text-ink-3">{order.estQuantity.toLocaleString('vi-VN')} {order.unit} · {L[`orderStatus_${order.status}`]}</p></div>{order.branchId && <span className="text-xs text-ink-3">{reportSummary?.branches.find((b) => b.branch?.id === order.branchId)?.branch?.name ?? L.enterpriseBranchLabel}</span>}</li>)}</ul>}
        </Card></div>

        {(canManageBranches || canManageStaff) && <div className="lg:col-span-12"><Card title={L.enterpriseManagement}>
          <div className="flex flex-wrap gap-3 text-sm text-ink-2">
            {canManageBranches && <span>{L.enterpriseBranchManagerHint}</span>}
            {canManageStaff && <span>{L.enterpriseStaffManagerHint}</span>}
            {userRole === 'manager' && branchId && <span>{L.enterpriseCurrentBranch}: {currentOrg?.branch?.name}</span>}
          </div>
          {permissions.includes('report:view') && <div className="mt-3"><Link to={ROUTES.reports} className="font-semibold text-brand underline">{L.navReports}</Link></div>}
        </Card></div>}

        {!canSeeReports && !canManageBranches && !canManageStaff && !permissions.includes('order:create') && !permissions.includes('order:respond') && <div className="lg:col-span-12"><EmptyState title={L.dashboardNoPermissions} /></div>}
      </div>
    </PageContainer>
  );
}

function Kpi({ label, amount, count, weight }: { readonly label: string; readonly amount: number; readonly count: number; readonly weight: number }) {
  return <section className="card p-5 lg:col-span-4"><p className="text-sm font-semibold text-ink-3">{label}</p><p className="num mt-2 text-2xl font-extrabold text-brand">{formatVnd(amount)}</p><p className="num mt-1 text-sm text-ink-2">{count} {L.receiptsCount} · {formatWeight(weight)}</p></section>;
}
