import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatVnd } from '@mambo/core/format';
import { useDashboardData } from '@/data/hooks/useDashboardData';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { DashboardHeader } from './DashboardHeader';
import { ROUTES } from '../shared/navItems';

export function FarmerDashboard() {
  const { permissions, features } = useStore();
  const { orders, linkedBalances, linkedReceipts, reportSummary, loading, errors, refresh } = useDashboardData();
  const canSeeOrders = features.includes('orders') && (permissions.includes('order:create') || permissions.includes('order:respond'));
  const canSeeLinked = features.includes('links') && permissions.includes('linked:read');
  const canSeeReport = permissions.includes('report:view');
  const activeOrders = orders.filter((order) =>
    ['submitted', 'accepted', 'scheduled'].includes(order.status),
  );
  const pickupOrders = activeOrders
    .filter((order) => order.pickupAt)
    .sort((a, b) => Date.parse(a.pickupAt ?? '') - Date.parse(b.pickupAt ?? ''))
    .slice(0, 5);
  const totalOwed = linkedBalances.reduce((sum, item) => sum + item.theyOwe, 0);
  const totalOwe = linkedBalances.reduce((sum, item) => sum + item.youOwe, 0);

  return (
    <PageContainer width="wide">
      <DashboardHeader />
      {permissions.includes('order:create') || permissions.includes('order:respond') ? !features.includes('orders') && <FeatureNotice>{L.farmerOrdersFeatureDisabled}</FeatureNotice> : null}
      {permissions.includes('linked:read') && !features.includes('links') && <FeatureNotice>{L.farmerLinksFeatureDisabled}</FeatureNotice>}
      {errors.environment && <SourceError title={L.dashboardLoadError} message={errors.environment} onRetry={refresh} />}
      {errors.orders && <SourceError title={L.farmerOrdersLoadError} message={errors.orders} onRetry={refresh} />}
      {errors.linked && <SourceError title={L.farmerLinkedLoadError} message={errors.linked} onRetry={refresh} />}
      {errors.report && <SourceError title={L.farmerReportLoadError} message={errors.report} onRetry={refresh} />}
      <div className="mb-4 flex flex-wrap gap-2">
        {canSeeOrders && <Link to={ROUTES.farmerOrders} className="inline-flex min-h-11 items-center rounded-xl border border-brand bg-brand px-4 font-semibold text-paper">{L.farmerOrders}</Link>}
        {canSeeLinked && <Link to={ROUTES.farmerNetwork} className="inline-flex min-h-11 items-center rounded-xl border border-rule bg-card px-4 font-semibold text-ink">{L.farmerNetworkTitle}</Link>}
      </div>
      {loading && <p className="mb-3 text-sm text-ink-3" aria-live="polite">{L.loading}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {canSeeLinked && (
          <section className="card p-5 lg:col-span-6">
            <h2 className="text-sm font-semibold text-ink-3">{L.farmerDebtSummary}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Metric label={L.farmerTheyOwe} value={totalOwed} />
              <Metric label={L.farmerYouOwe} value={totalOwe} />
            </div>
            <p className="mt-3 text-xs text-ink-3">{linkedBalances.length} {L.farmerConnectedOrganizations}</p>
          </section>
        )}
        {canSeeReport && reportSummary && (
          <section className="card p-5 lg:col-span-6">
            <h2 className="text-sm font-semibold text-ink-3">{L.farmerMonthSummary}</h2>
            <p className="num mt-2 text-3xl font-extrabold text-brand">{formatVnd(reportSummary.totals.sale.amount)}</p>
            <p className="mt-1 text-sm text-ink-2">{reportSummary.totals.sale.count} {L.receiptsCount} · {reportSummary.totals.sale.netWeight.toLocaleString('vi-VN')} kg</p>
            <p className="mt-2 text-xs text-ink-3">{L.farmerMonthDebt}: {formatVnd(reportSummary.totals.sale.debt)}</p>
          </section>
        )}
        {canSeeOrders && (
          <div className="lg:col-span-12">
            <Card title={L.farmerOrders}>
              <div className="mb-3 flex justify-end"><Link className="text-sm font-semibold text-brand underline" to={ROUTES.farmerOrders}>{L.viewAllOrders}</Link></div>
              {errors.orders ? <p className="text-sm text-ink-3">{L.farmerOrdersLoadError}</p> : activeOrders.length === 0 ? (
                <EmptyState title={L.farmerNoOrders} description={L.farmerNoOrdersHint} icon="🌱" />
              ) : (
                <ul className="divide-y divide-rule">
                  {activeOrders.slice(0, 6).map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="font-bold text-ink">{order.counterpart?.name ?? order.partnerName ?? L.farmerUnknownPartner}</p>
                        <p className="text-sm text-ink-3">{order.estQuantity.toLocaleString('vi-VN')} {order.unit} · {L[`orderStatus_${order.status}`]}</p>
                      </div>
                      {order.pickupAt && <time className="text-sm text-ink-2">{new Date(order.pickupAt).toLocaleString('vi-VN')}</time>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
        {canSeeOrders && (
          <div className="lg:col-span-12">
            <Card title={L.farmerPickupSchedule}>
              {errors.orders ? <p className="text-sm text-ink-3">{L.farmerOrdersLoadError}</p> : pickupOrders.length === 0 ? (
                <EmptyState title={L.farmerNoPickupSchedule} description={L.farmerNoPickupScheduleHint} icon="🗓️" />
              ) : (
                <ul className="divide-y divide-rule">
                  {pickupOrders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="font-bold text-ink">{order.counterpart?.name ?? order.partnerName ?? L.farmerUnknownPartner}</p>
                        <p className="text-sm text-ink-3">{order.estQuantity.toLocaleString('vi-VN')} {order.unit} · {L[`orderStatus_${order.status}`]}</p>
                      </div>
                      {order.pickupAt && <time className="text-sm font-semibold text-ink-2" dateTime={order.pickupAt}>
                        {new Date(order.pickupAt).toLocaleString('vi-VN')}
                      </time>}
                    </li>
                  ))}
                </ul>
              )}
              <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline" to={ROUTES.farmerOrders}>{L.viewAllOrders}</Link>
            </Card>
          </div>
        )}
        {canSeeLinked && (
          <div className="lg:col-span-12">
            <Card title={L.farmerConnectedOrganizations}>
              {linkedBalances.length === 0 && errors.linked ? <p className="text-sm text-ink-3">{L.farmerLinkedLoadError}</p> : linkedBalances.length === 0 ? <p className="text-sm text-ink-3">{L.farmerNoConnections}</p> : (
                <ul className="divide-y divide-rule">
                  {linkedBalances.map((item) => (
                    <li key={item.organization.id} className="flex items-center justify-between gap-3 py-3">
                      <div><p className="font-bold text-ink">{item.organization.name}</p><p className="text-xs text-ink-3">{item.receiptCount} {L.receiptsCount}</p></div>
                      <div className="text-right text-xs text-ink-2"><p>{L.farmerTheyOwe}: <b className="num">{formatVnd(item.theyOwe)}</b></p><p className="mt-1">{L.farmerYouOwe}: <b className="num">{formatVnd(item.youOwe)}</b></p></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
        {canSeeLinked && (
          <div className="lg:col-span-12">
            <Card title={L.farmerRecentReceipts}>
              {linkedReceipts.length === 0 && errors.linked ? <p className="text-sm text-ink-3">{L.farmerLinkedLoadError}</p> : linkedReceipts.length === 0 ? <p className="text-sm text-ink-3">{L.farmerNoReceipts}</p> : (
                <ul className="divide-y divide-rule">
                  {linkedReceipts.slice(0, 8).map((receipt) => {
                    const organization = linkedBalances.find((item) => item.organization.id === receipt.organizationId)?.organization.name;
                    return (
                      <li key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div>
                          <p className="font-bold text-ink">{organization ?? receipt.partyName}</p>
                          <p className="text-sm text-ink-3">{receipt.kind === 'purchase' ? L.farmerReceiptSale : L.farmerReceiptPurchase} · {receipt.lines[0]?.productName ?? L.product} · {new Date(receipt.date).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div className="text-right"><p className="num text-sm font-bold text-ink">{formatVnd(receipt.total)}</p>{receipt.debt > 0 && <p className="num text-xs text-ink-3">{L.farmerRemainingDebt}: {formatVnd(receipt.debt)}</p>}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        )}
        {!canSeeOrders && !canSeeLinked && !canSeeReport && (
          <div className="lg:col-span-12"><EmptyState title={L.dashboardNoPermissions} /></div>
        )}
      </div>
    </PageContainer>
  );
}

function FeatureNotice({ children }: { readonly children: string }) {
  return <p className="mb-3 rounded-xl border border-rule bg-surface-2 p-3 text-sm text-ink-2">{children}</p>;
}

function SourceError({ title, message, onRetry }: { readonly title: string; readonly message: string; readonly onRetry: () => void }) {
  return <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-ink"><span><b>{title}</b> {message}</span><Button onClick={onRetry}>{L.dashboardRetry}</Button></div>;
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return <div><p className="text-xs text-ink-3">{label}</p><p className="num mt-1 text-xl font-extrabold text-ink">{formatVnd(value)}</p></div>;
}
