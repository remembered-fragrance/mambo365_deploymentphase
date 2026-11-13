import { useMemo, useState } from 'react';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import {
  buildAnalytics,
  buildRubberReconcile,
  type ProductAnalytics,
  type RubberReconcile,
  type SellerRubber,
} from '@mambo/core/analytics';
import { formatQuantity, formatVnd } from '@mambo/core/format';
import { currentRange, previousRange, type PeriodKind } from '@mambo/core/taxPeriods';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';

const PERIOD_OPTIONS = [
  { value: 'month', label: L.periodMonth },
  { value: 'quarter', label: L.periodQuarter },
  { value: 'year', label: L.periodYear },
];

const NONE = '—';
const percent = (n: number | null): string => (n === null ? NONE : `${String(n).replace('.', ',')}%`);
const signed = (n: number, text: string): string => (n > 0 ? `+${text}` : text);

function Figure({ label, value, note }: { readonly label: string; readonly value: string; readonly note?: string }) {
  return (
    <div className="card min-w-0 p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="num mt-1 text-xl font-extrabold text-ink [overflow-wrap:anywhere]">{value}</p>
      {note && <p className="num mt-1 text-sm text-ink-3">{note}</p>}
    </div>
  );
}

const side = (qty: number, unit: string, avg: number | null): string =>
  qty > 0 ? `${formatQuantity(qty, unit)} · ${avg === null ? NONE : formatVnd(avg)}` : NONE;

const productColumns: Column<ProductAnalytics>[] = [
  { id: 'product', header: L.colProduct, cell: (r) => r.product, mobile: 'title' },
  {
    id: 'bought',
    header: L.analyticsBought,
    cell: (r) => side(r.boughtQty, r.unit, r.avgBuyPrice),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
  },
  {
    id: 'sold',
    header: L.analyticsSold,
    cell: (r) => side(r.soldQty, r.unit, r.avgSellPrice),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
  },
  {
    id: 'profit',
    header: L.analyticsProfit,
    cell: (r) =>
      r.profit === null ? (
        <span className="text-ink-3">{L.analyticsNoProfit}</span>
      ) : (
        <span className={r.profit < 0 ? 'text-alert' : undefined}>{formatVnd(r.profit)}</span>
      ),
    align: 'right',
    numeric: true,
    mobile: 'value',
  },
];

const rubberColumns: Column<RubberReconcile>[] = [
  {
    id: 'product',
    header: L.colProduct,
    cell: (r) => `${r.product} (${r.rubberKind === 'cuplump' ? L.rubberCuplump : L.rubberLatex})`,
    mobile: 'title',
  },
  {
    id: 'bought',
    header: L.rubberBoughtPercent,
    cell: (r) => percent(r.bought.avgPercent),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
  },
  {
    id: 'sold',
    header: L.rubberSoldPercent,
    cell: (r) => percent(r.sold.avgPercent),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
  },
  {
    id: 'gap',
    header: L.rubberGap,
    cell: (r) => (r.gapPercent === null ? NONE : signed(r.gapPercent, `${String(r.gapPercent).replace('.', ',')} ${L.rubberDegree}`)),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
  },
  {
    id: 'amount',
    header: L.rubberGapAmount,
    cell: (r) =>
      r.gapAmount === null ? (
        <span className="text-ink-3">{L.rubberNeedBoth}</span>
      ) : (
        <span className={r.gapAmount > 0 ? 'text-alert' : undefined}>{formatVnd(r.gapAmount)}</span>
      ),
    align: 'right',
    numeric: true,
    mobile: 'value',
  },
];

const sellerColumns: Column<SellerRubber>[] = [
  { id: 'seller', header: L.supplier, cell: (r) => r.sellerName, mobile: 'title' },
  { id: 'product', header: L.colProduct, cell: (r) => r.product, mobile: 'secondary' },
  { id: 'wet', header: L.rubberWetKg, cell: (r) => formatQuantity(r.wetKg, 'kg'), align: 'right', numeric: true, mobile: 'secondary' },
  { id: 'avg', header: L.rubberAvgPercent, cell: (r) => percent(r.avgPercent), align: 'right', numeric: true, mobile: 'value' },
];

/**
 * Phân tích (V8) và đối chiếu độ mủ (V21) — tính ở máy từ sổ (`@mambo/core/analytics`), không cần mạng.
 * Lời là lời ƯỚC TÍNH theo giá bình quân, nói rõ trên màn để không ai đem chép sang tờ khai.
 */
export function AnalyticsPage() {
  const paid = useEntitlement('analytics');
  return (
    <PageContainer width="wide">
      <PageHeader title={L.navAnalytics} subtitle={L.analyticsSubtitle} />
      {paid ? <AnalyticsView /> : <PlanGate reason={L.gateAnalytics} feature="analytics" />}
    </PageContainer>
  );
}

/** Chỉ dựng khi có gói: không có thì trang chỉ hiện `PlanGate`, khỏi tính phân tích trên cả sổ. */
function AnalyticsView() {
  const { data } = useStore();
  const rubberPaid = useEntitlement('rubber:reconcile');
  const [kind, setKind] = useState<PeriodKind>('month');

  const range = useMemo(() => currentRange(kind), [kind]);
  const prev = useMemo(() => previousRange(kind), [kind]);
  const report = useMemo(() => buildAnalytics(data, range), [data, range]);
  const before = useMemo(() => buildAnalytics(data, prev), [data, prev]);
  const rubber = useMemo(() => buildRubberReconcile(data, range), [data, range]);
  const delta = report.profit - before.profit;

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label={L.taxPeriod}
        value={kind}
        options={PERIOD_OPTIONS}
        onValueChange={(value) => setKind(value as PeriodKind)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Figure label={`${L.analyticsProfit} · ${range.label}`} value={formatVnd(report.profit)} />
        <Figure
          label={`${L.analyticsPrevious} · ${prev.label}`}
          value={formatVnd(before.profit)}
          note={`${L.analyticsChange} ${signed(delta, formatVnd(delta))}`}
        />
      </div>
      <p className="text-sm text-ink-3">{L.analyticsEstimateNote}</p>

      <section>
        <h2 className="mb-2 text-base font-bold text-ink">{L.analyticsByProduct}</h2>
        {report.products.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-3">{L.analyticsEmpty}</p>
          </Card>
        ) : (
          <DataView rows={report.products} columns={productColumns} getKey={(r) => r.key} caption={L.analyticsByProduct} />
        )}
      </section>

      {rubber.products.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-ink">{L.rubberReconcileTitle}</h2>
          {!rubberPaid ? (
            <PlanGate reason={L.gateRubberReconcile} feature="rubber" />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-3">{L.rubberReconcileNote}</p>
              <DataView rows={rubber.products} columns={rubberColumns} getKey={(r) => r.key} caption={L.rubberReconcileTitle} />
              {rubber.sellers.length > 0 && (
                <>
                  <h3 className="mt-2 text-sm font-bold text-ink">{L.rubberBySeller}</h3>
                  <DataView
                    rows={rubber.sellers}
                    columns={sellerColumns}
                    getKey={(r) => `${r.sellerName}\u0000${r.product}`}
                    caption={L.rubberBySeller}
                  />
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
