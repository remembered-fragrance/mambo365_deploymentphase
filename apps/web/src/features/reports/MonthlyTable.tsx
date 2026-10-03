import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { formatVnd } from '@/core/format';
import type { TaxReport } from '@/core/taxReport';
import { L } from '@/i18n/labels';

const columns: Column<TaxReport>[] = [
  { id: 'month', header: L.colMonth, cell: (r) => r.range.label, mobile: 'title' },
  {
    id: 'purchase',
    header: L.taxTotalPurchase,
    cell: (r) => formatVnd(r.totalPurchase),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
  },
  {
    id: 'sale',
    header: L.taxTotalSale,
    cell: (r) => formatVnd(r.totalSale),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
  },
  {
    id: 'profit',
    header: L.taxGrossProfit,
    cell: (r) => formatVnd(r.grossProfit),
    align: 'right',
    numeric: true,
    mobile: 'value',
  },
];

/** Mười hai tháng của một năm, cộng sẵn — thứ kế toán hỏi đầu tiên. */
export function MonthlyTable({
  reports,
  year,
}: {
  readonly reports: readonly TaxReport[];
  readonly year: number;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold text-ink">
        {L.reportMonthTable} {year}
      </h2>
      <DataView
        rows={reports}
        columns={columns}
        getKey={(r) => r.range.label}
        caption={L.reportMonthTable}
      />
    </section>
  );
}
