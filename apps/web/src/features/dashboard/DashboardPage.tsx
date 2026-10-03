import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarChart } from '@/components/data/BarChart';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatVnd, formatVndShort, formatWeight } from '@/core/format';
import { inventoryByProduct } from '@/core/inventory';
import { dailySpend, debtsBySupplier, salesSummaryFor, summaryFor } from '@/core/selectors';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { WelcomeScreen } from '../onboarding/WelcomeScreen';
import { ROUTES } from '../shared/navItems';
import { TodayTasks } from './TodayTasks';

export function DashboardPage() {
  const { data } = useStore();

  // Sổ rỗng thì không vẽ một trang toàn số 0 — người mới cần biết bấm gì tiếp.
  const empty = data.transactions.length === 0 && data.drafts.length === 0;

  const today = useMemo(() => summaryFor(data, 'today'), [data]);
  const week = useMemo(() => summaryFor(data, 'week'), [data]);
  const month = useMemo(() => summaryFor(data, 'month'), [data]);
  const sales = useMemo(() => salesSummaryFor(data, 'month'), [data]);
  const chart = useMemo(
    () =>
      dailySpend(data, 7).map((p) => ({
        label: p.label,
        value: p.spent,
        display: formatVndShort(p.spent),
      })),
    [data],
  );

  const tasks = useMemo(
    () => [
      {
        id: 'weighing',
        count: data.drafts.filter((d) => d.status === 'draft').length,
        label: L.todoWeighing,
        to: `${ROUTES.receipts}?tab=draft`,
      },
      {
        id: 'debts',
        count: debtsBySupplier(data).length,
        label: L.todoDebts,
        to: ROUTES.debts,
      },
      {
        id: 'stock',
        count: inventoryByProduct(data).filter((r) => r.stockKg < 0).length,
        label: L.todoNegativeStock,
        to: ROUTES.inventory,
      },
    ],
    [data],
  );

  if (empty) return <WelcomeScreen />;

  return (
    <PageContainer width="wide">
      <PageHeader title={L.navDashboard} actions={<HelpButton topic="dashboard" />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Khối Hero duy nhất của trang — con số chủ vựa mở app ra để xem. */}
        <section className="card p-5 lg:col-span-7">
          <p className="text-sm font-semibold text-ink-3">{L.spentToday}</p>
          <p aria-live="polite" className="num mt-1 text-4xl font-extrabold text-brand lg:text-5xl">
            {formatVnd(today.spent)}
          </p>
          <p className="num mt-1 text-sm text-ink-2">
            {today.count} {L.receiptsCount} · {formatWeight(today.weight)}
          </p>
        </section>

        <div className="lg:col-span-5">
          <TodayTasks tasks={tasks} />
        </div>

        <div className="grid grid-cols-3 gap-2 lg:col-span-12">
          <KpiTile label={L.periodDay} amount={today.spent} count={today.count} to={`${ROUTES.receipts}?period=day`} />
          <KpiTile label={L.spentWeek} amount={week.spent} count={week.count} to={`${ROUTES.receipts}?period=week`} />
          <KpiTile label={L.spentMonth} amount={month.spent} count={month.count} to={`${ROUTES.receipts}?period=month`} />
        </div>

        <div className="lg:col-span-7">
          <Card title={L.last7Days}>
            <BarChart points={chart} caption={L.last7Days} />
          </Card>
        </div>

        <div className="lg:col-span-5">
          {/* Khi chưa có phiếu bán thì KHÔNG ẩn khối này đi: ẩn nghĩa là người
              dùng không bao giờ biết app làm được việc đó. */}
          {sales.count === 0 ? (
            <EmptyState
              title={L.salesEmpty}
              description={L.salesEmptyHint}
              icon="📦"
              action={
                <Link
                  to={`${ROUTES.create}?kind=sale`}
                  className="inline-flex min-h-[var(--density-row-h)] items-center rounded-xl border border-brand bg-brand px-4 font-semibold text-paper"
                >
                  {L.createSale}
                </Link>
              }
            />
          ) : (
            <Card title={L.salesBlock}>
              <p className="num text-3xl font-extrabold text-out">{formatVnd(sales.spent)}</p>
              <p className="num mt-1 text-sm text-ink-2">
                {sales.count} {L.receiptsCount} · {formatWeight(sales.weight)}
              </p>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

interface KpiTileProps {
  readonly label: string;
  readonly amount: number;
  readonly count: number;
  readonly to: string;
}

function KpiTile({ label, amount, count, to }: KpiTileProps) {
  return (
    <Link to={to} className="card flex flex-col justify-between p-3">
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <span className="num mt-1 text-lg font-extrabold text-ink">{formatVndShort(amount)}</span>
      <span className="num text-xs text-ink-3">
        {count} {L.receiptsCount}
      </span>
    </Link>
  );
}
