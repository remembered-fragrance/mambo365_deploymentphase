import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { WarningIcon } from '@/components/ui/icons';
import { formatVnd } from '@/core/format';
import { buildTaxReport } from '@/core/taxReport';
import { currentRange, monthsOfYear, type PeriodKind } from '@/core/taxPeriods';
import { useStore } from '@/data/useStore';
import { L, SUB } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { MonthlyTable } from './MonthlyTable';

const PERIOD_OPTIONS = [
  { value: 'month', label: L.periodMonth },
  { value: 'quarter', label: L.periodQuarter },
  { value: 'year', label: L.periodYear },
];

/** Bốn ô số của kỳ đang chọn. Số to, nhãn nhỏ — đây là thứ người ta chép sang tờ khai. */
function Figure({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="num mt-1 text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}

export function ReportsPage() {
  const { data } = useStore();
  const [kind, setKind] = useState<PeriodKind>('month');

  const range = useMemo(() => currentRange(kind), [kind]);
  const report = useMemo(() => buildTaxReport(data, range), [data, range]);
  const year = range.from.getFullYear();
  const months = useMemo(
    () => monthsOfYear(year).map((r) => buildTaxReport(data, r)),
    [data, year],
  );

  const exportXlsx = async () => {
    const { exportTaxReportXlsx } = await import('@/export/taxReportXlsx');
    await exportTaxReportXlsx(data, range, `thumua365-bao-cao-${year}.xlsx`);
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title={L.taxReport}
        subtitle={SUB.taxReport}
        actions={
          <>
            <HelpButton topic="reports" />
            <Button tone="primary" onClick={exportXlsx}>
              {L.exportExcel}
            </Button>
          </>
        }
      />

      <div className="mb-3">
        <Segmented
          label={L.taxPeriod}
          value={kind}
          options={PERIOD_OPTIONS}
          onValueChange={(value) => setKind(value as PeriodKind)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="flex flex-col gap-3">
          <p className="num text-sm font-semibold text-ink-2">{range.label}</p>
          <div className="grid grid-cols-2 gap-3">
            <Figure label={L.taxTotalPurchase} value={formatVnd(report.totalPurchase)} />
            <Figure label={L.taxTotalSale} value={formatVnd(report.totalSale)} />
            <Figure label={L.taxGrossProfit} value={formatVnd(report.grossProfit)} />
            <Figure
              label={L.taxPurchaseCount}
              value={`${report.purchaseCount} / ${report.saleCount}`}
            />
          </div>

          <Card title={L.reportLegalTitle}>
            <p className="flex items-start gap-2 text-sm text-ink-2">
              <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
              {L.reportLegalBody}
            </p>
          </Card>
        </div>

        {/* Bảng 12 tháng chỉ có ở màn rộng: điện thoại đã có bốn ô số ở trên,
            nhồi thêm bảng vào là bắt cuộn dọc rất dài để đọc một con số. */}
        <div className="hidden xl:block">
          <MonthlyTable reports={months} year={year} />
        </div>
      </div>
    </PageContainer>
  );
}
