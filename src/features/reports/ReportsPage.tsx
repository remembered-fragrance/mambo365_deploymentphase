import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Segmented } from '@/components/ui/Segmented';
import { WarningIcon } from '@/components/ui/icons';
import { formatVnd } from '@mambo/core/format';
import { buildTaxReport, TAX_REPORT_DISCLAIMER } from '@mambo/core/taxReport';
import { currentRange, monthsOfYear, type PeriodKind } from '@mambo/core/taxPeriods';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { useOnceFlag } from '@/data/hooks/useOnceFlag';
import { useStore } from '@/data/useStore';
import { L, SUB } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';
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
    // `min-w-0` + ngắt bất kỳ chỗ nào: số tỷ đồng (kể cả lỗ, có dấu −) ở cột 26rem của màn xl vẫn không tràn ô.
    <div className="card min-w-0 p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="num mt-1 text-xl font-extrabold text-ink [overflow-wrap:anywhere]">{value}</p>
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

  // Bảng kê thu mua (V12) và bộ hồ sơ kê khai (V17) — gói Pro; lần đầu phải bấm "Tôi hiểu" (cột CCCD, địa chỉ để
  // trống, tự chịu trách nhiệm). Bấm nút nào thì "Tôi hiểu" xuất đúng file đó.
  const ledgerPaid = useEntitlement('tax:docs');
  const ack = useOnceFlag('tax-ledger-ack');
  const [asking, setAsking] = useState<'ledger' | 'pack' | null>(null);
  const month = String(range.from.getMonth() + 1).padStart(2, '0');
  const exportLedger = async () => {
    const { exportPurchaseLedgerXlsx } = await import('@/export/purchaseLedgerXlsx');
    await exportPurchaseLedgerXlsx(data, range, `thumua365-bang-ke-thu-mua-${year}-${month}.xlsx`);
  };
  const exportPack = async () => {
    const { exportTaxPackXlsx } = await import('@/export/taxPackXlsx');
    await exportTaxPackXlsx(data, range, `thumua365-ho-so-ke-khai-${year}-${month}.xlsx`);
  };
  const run = (which: 'ledger' | 'pack') => void (which === 'ledger' ? exportLedger() : exportPack());

  return (
    <PageContainer width="wide">
      <PageHeader
        title={L.taxReport}
        subtitle={SUB.taxReport}
        actions={
          <>
            <HelpButton topic="reports" />
            {ledgerPaid && (
              <>
                <Button onClick={() => (ack.done ? run('ledger') : setAsking('ledger'))}>{L.taxLedgerExport}</Button>
                <Button onClick={() => (ack.done ? run('pack') : setAsking('pack'))}>{L.taxPackExport}</Button>
              </>
            )}
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
          {/* Một cột trên điện thoại: hai cột thì ô chỉ còn ~104px ở 320px, số hàng chục triệu đã phải ngắt dòng. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Figure label={L.taxTotalPurchase} value={formatVnd(report.totalPurchase)} />
            <Figure label={L.taxTotalSale} value={formatVnd(report.totalSale)} />
            <Figure
              label={L.taxGrossProfit}
              value={report.saleCount > 0 ? formatVnd(report.grossProfit) : L.taxNoSaleYet}
            />
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
          {!ledgerPaid && <PlanGate reason={L.gateTaxLedger} feature="tax" />}
        </div>

        {/* Bảng 12 tháng chỉ có ở màn rộng: điện thoại đã có bốn ô số ở trên,
            nhồi thêm bảng vào là bắt cuộn dọc rất dài để đọc một con số. */}
        <div className="hidden xl:block">
          <MonthlyTable reports={months} year={year} />
        </div>
      </div>

      <Dialog open={asking !== null} title={L.taxLedgerConfirmTitle} onClose={() => setAsking(null)}>
        <p className="text-base text-ink-2">{L.taxLedgerConfirmBody}</p>
        <p className="mt-3 text-base font-semibold text-ink">{TAX_REPORT_DISCLAIMER}</p>
        <div className="mt-5 flex gap-3">
          <Button tone="quiet" block onClick={() => setAsking(null)}>
            {L.cancel}
          </Button>
          <Button
            tone="primary"
            block
            onClick={() => {
              ack.markDone();
              if (asking) run(asking);
              setAsking(null);
            }}
          >
            {L.taxLedgerIUnderstand}
          </Button>
        </div>
      </Dialog>
    </PageContainer>
  );
}
