import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarChart } from '@/components/data/BarChart';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatVnd, formatWeight } from '@mambo/core/format';
import { inventoryByProduct } from '@mambo/core/inventory';
import { dailySpend, debtsBySupplier, salesSummaryFor, summaryFor } from '@mambo/core/selectors';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { WelcomeScreen } from '../onboarding/WelcomeScreen';
import { allows } from '../shared/access';
import { ROUTE_GATES, ROUTES } from '../shared/navItems';
import { useAccess } from '../shared/useAccess';
import { LinkCodesCard } from './LinkCodesCard';
import { StaffTodayCard } from './StaffTodayCard';
import { TodayTasks } from './TodayTasks';

export function DashboardPage() {
  const { data, currentOrgId } = useStore();
  const access = useAccess();
  const { can } = access;
  // Hai thẻ cần máy chủ: mã kết nối (người giữ danh bạ) và việc của nhân viên (chủ).
  const showLinks = Boolean(currentOrgId) && can('partner:manage');
  const showStaff = Boolean(currentOrgId) && can('staff:manage');
  // Cùng điều kiện với màn Tạo phiếu: nút dẫn tới màn bị chặn thì chỉ làm người ta bực.
  const showQuick = allows(access, ROUTE_GATES[ROUTES.create]);
  const quickLinks = QUICK_LINKS.filter((q) => allows(access, ROUTE_GATES[q.gate]));

  // Sổ rỗng thì không vẽ một trang toàn số 0 — người mới cần biết bấm gì tiếp.
  const empty = data.transactions.length === 0 && data.drafts.length === 0;

  const today = useMemo(() => summaryFor(data, 'today'), [data]);
  const week = useMemo(() => summaryFor(data, 'week'), [data]);
  const month = useMemo(() => summaryFor(data, 'month'), [data]);
  const sales = useMemo(() => salesSummaryFor(data, 'month'), [data]);
  const debts = useMemo(() => debtsBySupplier(data), [data]);
  const chart = useMemo(
    () =>
      dailySpend(data, 7).map((p, i, all) => ({
        label: p.label,
        // Bỏ năm khỏi formatDate: chỉ ngày + tháng thì Chrome ghi '17-10', lệch với 17/10/2026 cả app đang dùng.
        sublabel: formatDate(p.date).slice(0, 5),
        value: p.spent,
        // Số đủ, không '9,8tr': khối trên ghi 13.154.000₫ mà ô dưới ghi 13,2tr thì người xem tưởng hai số khác nhau.
        display: formatVnd(p.spent),
        // `dailySpend` trả cũ → mới: điểm cuối là hôm nay.
        highlight: i === all.length - 1,
      })),
    [data],
  );
  const chartEmpty = chart.every((p) => p.value === 0);
  // Ghi dưới biểu đồ chứ không trên đầu cột: số đủ rộng hơn cột ở 320px.
  const peak = chart.reduce<(typeof chart)[number] | undefined>(
    (best, p) => (best === undefined || p.value > best.value ? p : best),
    undefined,
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
        // `debtsBySupplier` chỉ tính phiếu mua: tiền MÌNH còn nợ người bán, không phải người ta nợ mình.
        id: 'debts',
        count: debts.length,
        label: L.todoDebts,
        amount: formatVnd(debts.reduce((sum, d) => sum + d.debt, 0)),
        to: ROUTES.debts,
      },
      {
        id: 'stock',
        count: inventoryByProduct(data).filter((r) => r.stockKg < 0).length,
        label: L.todoNegativeStock,
        to: ROUTES.inventory,
      },
    ],
    [data, debts],
  );

  if (empty) return <WelcomeScreen />;

  const hasSales = sales.count > 0;
  // Cột phải cạnh biểu đồ: thao tác nhanh + lời mời tạo phiếu bán. Trống cả hai thì biểu đồ chiếm hết hàng.
  const showSide = showQuick || !hasSales;

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

        {/* Không có ô "Hôm nay": khối trên đã ghi đúng con số đó. Bán ra đứng cạnh chi mua 30 ngày
            để thấy chênh lệch; tím `out` cùng màu nhãn phiếu bán ở màn Phiếu. */}
        <div className={`grid grid-cols-1 gap-2 lg:col-span-12 ${hasSales ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <KpiTile label={L.spentWeek} amount={week.spent} count={week.count} to={`${ROUTES.receipts}?period=week`} />
          <KpiTile label={L.spentMonth} amount={month.spent} count={month.count} to={`${ROUTES.receipts}?period=month`} />
          {hasSales && (
            <KpiTile
              label={L.salesBlock}
              amount={sales.spent}
              count={sales.count}
              to={`${ROUTES.receipts}?period=month&kind=sale`}
              tone="out"
            />
          )}
        </div>

        <div className={showSide ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Card title={L.last7Days}>
            {/* Bảy vạch phẳng trông như biểu đồ chưa tải xong — nói rõ là tuần này chưa mua. */}
            {chartEmpty && <p className="mb-2 text-sm text-ink-3">{L.last7DaysEmpty}</p>}
            <BarChart points={chart} caption={L.last7Days} />
            {!chartEmpty && peak && (
              <p className="num mt-3 text-sm text-ink-2">
                {L.last7DaysPeak}: {peak.label} {peak.sublabel} — <span className="font-bold text-ink">{peak.display}</span>
              </p>
            )}
          </Card>
        </div>

        {showSide && (
          <div className="flex flex-col gap-4 lg:col-span-5">
            {showQuick && (
              <Card title={L.quickActionsTitle}>
                <div className="grid grid-cols-2 gap-3">
                  {quickLinks.map((q, i) => (
                    <Link
                      key={q.to}
                      to={q.to}
                      className={`flex min-h-12 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm ${
                        i === 0 ? 'border-brand bg-brand font-bold text-paper' : 'border-rule bg-paper font-semibold text-ink'
                      }`}
                    >
                      {q.label}
                    </Link>
                  ))}
                </div>
              </Card>
            )}
            {/* Khi chưa có phiếu bán thì KHÔNG ẩn hẳn: ẩn nghĩa là người dùng không bao giờ biết app làm được việc đó. */}
            {!hasSales && (
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
            )}
          </div>
        )}

        {showStaff && (
          <div className="lg:col-span-6">
            <StaffTodayCard />
          </div>
        )}
        {showLinks && (
          <div className="lg:col-span-6">
            <LinkCodesCard />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

/** `gate` = màn đích trong `ROUTE_GATES`; nút nào không vào được thì không vẽ. */
const QUICK_LINKS = [
  { to: `${ROUTES.create}?kind=purchase`, gate: ROUTES.create, label: L.createPurchase },
  { to: `${ROUTES.create}?kind=sale`, gate: ROUTES.create, label: L.createSale },
  { to: ROUTES.debts, gate: ROUTES.debts, label: L.navDebts },
  { to: ROUTES.reports, gate: ROUTES.reports, label: L.navReports },
] as const;

interface KpiTileProps {
  readonly label: string;
  readonly amount: number;
  readonly count: number;
  readonly to: string;
  readonly tone?: 'out';
}

/**
 * Điện thoại: một hàng — nhãn trái, số tiền đủ phải, số phiếu dưới số tiền. Ba ô một hàng ở 375px
 * chỉ rộng ~85px, không vừa 36.433.000₫. Từ `sm` mới đứng thành ô.
 */
function KpiTile({ label, amount, count, to, tone }: KpiTileProps) {
  return (
    <Link
      to={to}
      className="card grid grid-cols-[1fr_auto] items-baseline gap-x-3 p-3 sm:flex sm:flex-col sm:justify-between"
    >
      <span className="text-sm font-semibold text-ink-3 sm:text-xs">{label}</span>
      <span className={`num text-right text-lg font-extrabold sm:mt-1 sm:text-left ${tone === 'out' ? 'text-out' : 'text-ink'}`}>
        {formatVnd(amount)}
      </span>
      <span className="num col-start-2 text-right text-xs text-ink-3 sm:text-left">
        {count} {L.receiptsCount}
      </span>
    </Link>
  );
}
