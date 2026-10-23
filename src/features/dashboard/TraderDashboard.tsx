import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart } from '@/components/data/BarChart';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChevronRightIcon } from '@/components/ui/icons';
import { formatVnd, formatVndShort, formatWeight } from '@/core/format';
import { inventoryByProduct } from '@/core/inventory';
import {
  dailySpend,
  debtsBySupplier,
  purchases,
  salesSummaryFor,
  summaryFor,
} from '@/core/selectors';
import { useDashboardData } from '@/data/hooks/useDashboardData';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { WelcomeScreen } from '../onboarding/WelcomeScreen';
import { ROUTES } from '../shared/navItems';
import { DashboardHeader } from './DashboardHeader';
import { TodayTasks, type TaskLine } from './TodayTasks';

export function TraderDashboard() {
  const { data, userRole } = useStore();
  const { pendingOrdersCount, scheduledTodayCount } = useDashboardData();

  const isStaff = userRole === 'staff';
  const empty = data.transactions.length === 0 && data.drafts.length === 0;

  // Nếu là chủ và sổ hoàn toàn rỗng thì hiển thị màn chào mừng/dữ liệu mẫu
  if (empty && !isStaff) {
    return <WelcomeScreen />;
  }

  return (
    <PageContainer width="wide">
      <DashboardHeader />
      {isStaff ? (
        <TraderStaffView scheduledTodayCount={scheduledTodayCount} />
      ) : (
        <TraderOwnerView pendingOrdersCount={pendingOrdersCount} />
      )}
    </PageContainer>
  );
}

// ─── GIAO DIỆN CHỦ VỰA (QUẢN LÝ TÀI CHÍNH & TOÀN BỘ VỰA) ──────────────────────────

interface OwnerViewProps {
  readonly pendingOrdersCount: number;
}

function TraderOwnerView({ pendingOrdersCount }: OwnerViewProps) {
  const { data } = useStore();

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

  const tasks = useMemo<TaskLine[]>(() => {
    const list: TaskLine[] = [
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
    ];

    if (pendingOrdersCount > 0) {
      list.unshift({
        id: 'orders',
        count: pendingOrdersCount,
        label: L.ordersWaiting,
        to: ROUTES.receipts,
      });
    }

    return list;
  }, [data, pendingOrdersCount]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Khối Hero duy nhất của trang — con số chi mua hôm nay */}
      <section className="card p-5 lg:col-span-7">
        <p className="text-sm font-semibold text-ink-3">{L.spentToday}</p>
        <p aria-live="polite" className="num mt-1 text-4xl font-extrabold text-brand lg:text-5xl">
          {formatVnd(today.spent)}
        </p>
        <p className="num mt-1 text-sm text-ink-2">
          {today.count} {L.receiptsCount} · {formatWeight(today.weight)}
        </p>
      </section>

      {/* Việc cần làm */}
      <div className="lg:col-span-5">
        <TodayTasks tasks={tasks} />
      </div>

      {/* Ba thẻ KPI tổng quan */}
      <div className="grid grid-cols-3 gap-2 lg:col-span-12">
        <KpiTile
          label={L.periodDay}
          amount={today.spent}
          count={today.count}
          to={`${ROUTES.receipts}?period=day`}
        />
        <KpiTile
          label={L.spentWeek}
          amount={week.spent}
          count={week.count}
          to={`${ROUTES.receipts}?period=week`}
        />
        <KpiTile
          label={L.spentMonth}
          amount={month.spent}
          count={month.count}
          to={`${ROUTES.receipts}?period=month`}
        />
      </div>

      {/* Biểu đồ 7 ngày gần nhất */}
      <div className="lg:col-span-7">
        <Card title={L.last7Days}>
          <BarChart points={chart} caption={L.last7Days} />
        </Card>
      </div>

      {/* Khối xuất bán 30 ngày */}
      <div className="lg:col-span-5">
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

      {/* Thao tác nhanh cho chủ vựa */}
      <div className="lg:col-span-12">
        <Card title={L.quickActionsTitle}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              to={`${ROUTES.create}?kind=purchase`}
              className="flex min-h-12 items-center justify-center rounded-xl border border-brand bg-brand px-3 py-2 text-center text-sm font-bold text-paper"
            >
              {L.createPurchase}
            </Link>
            <Link
              to={`${ROUTES.create}?kind=sale`}
              className="flex min-h-12 items-center justify-center rounded-xl border border-rule bg-paper px-3 py-2 text-center text-sm font-semibold text-ink"
            >
              {L.createSale}
            </Link>
            <Link
              to={ROUTES.debts}
              className="flex min-h-12 items-center justify-center rounded-xl border border-rule bg-paper px-3 py-2 text-center text-sm font-semibold text-ink"
            >
              {L.navDebts}
            </Link>
            <Link
              to={ROUTES.reports}
              className="flex min-h-12 items-center justify-center rounded-xl border border-rule bg-paper px-3 py-2 text-center text-sm font-semibold text-ink"
            >
              {L.navReports}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── GIAO DIỆN NHÂN VIÊN CÂN HÀNG (TỐI ƯU THAO TÁC CA TRỰC) ─────────────────────

interface StaffViewProps {
  readonly scheduledTodayCount: number;
}

function TraderStaffView({ scheduledTodayCount }: StaffViewProps) {
  const { data } = useStore();

  const drafts = data.drafts.filter((d) => d.status === 'draft');
  const recentPurchases = useMemo(
    () => purchases(data).slice(0, 5),
    [data],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Khối nhiệm vụ ca trực */}
      <section className="card p-5">
        <h2 className="text-lg font-bold text-ink">{L.staffShiftTitle}</h2>
        <p className="mt-1 text-sm text-ink-3">{L.staffShiftHint}</p>

        {/* Nút bấm thao tác nhanh to rõ tại bàn cân */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            to={`${ROUTES.create}?kind=purchase`}
            className="flex min-h-14 items-center justify-center rounded-xl border border-brand bg-brand px-4 py-3 text-base font-extrabold text-paper shadow-sm active:scale-[0.98]"
          >
            {L.createPurchase}
          </Link>
          <Link
            to={`${ROUTES.create}?kind=sale`}
            className="flex min-h-14 items-center justify-center rounded-xl border border-rule bg-paper px-4 py-3 text-base font-semibold text-ink shadow-sm active:scale-[0.98]"
          >
            {L.createSale}
          </Link>
          <Link
            to={ROUTES.receipts}
            className="flex min-h-14 items-center justify-center rounded-xl border border-rule bg-paper px-4 py-3 text-base font-semibold text-ink shadow-sm active:scale-[0.98]"
          >
            {L.navReceipts}
          </Link>
        </div>
      </section>

      {/* Danh sách phiếu nháp đang cân tại bàn */}
      <Card title={L.draftWeighing}>
        {drafts.length === 0 ? (
          <p className="text-sm text-ink-3">{L.todoNothing}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-bold text-ink">{draft.supplierName || L.walkIn}</p>
                  <p className="text-xs text-ink-3">
                    {draft.lines.length} {L.product} · {draft.kind === 'sale' ? L.sale : L.purchase}
                  </p>
                </div>
                <Link
                  to={`${ROUTES.create}?draft=${draft.id}`}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-brand bg-surface-brand px-3 text-xs font-bold text-brand"
                >
                  {L.startWeighing}
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Thông báo đơn hẹn hôm nay nếu có */}
      {scheduledTodayCount > 0 && (
        <Card title={L.ordersSection}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">
              <span className="num font-extrabold text-brand">{scheduledTodayCount}</span>{' '}
              {L.ordersScheduledToday}
            </p>
            <Link
              to={ROUTES.receipts}
              className="text-xs font-semibold text-brand underline"
            >
              {L.viewAllOrders}
            </Link>
          </div>
        </Card>
      )}

      {/* Phiếu cân vừa hoàn thành gần đây trong ca */}
      <Card title={L.staffRecentReceipts}>
        {recentPurchases.length === 0 ? (
          <p className="text-sm text-ink-3">{L.staffNoReceiptsToday}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule">
            {recentPurchases.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-bold text-ink">{tx.supplierName || L.walkIn}</p>
                  <p className="text-xs text-ink-3">
                    {new Date(tx.date).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-extrabold text-brand">
                    {formatVnd(tx.amountPaid)}
                  </p>
                  <Link
                    to={ROUTES.receiptDetail(tx.id)}
                    className="text-xs font-semibold text-ink-3 underline"
                  >
                    {L.history}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ─── KPI TILE HELPER ─────────────────────────────────────────────────────────────

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
