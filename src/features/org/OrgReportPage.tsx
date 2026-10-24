import { useState } from 'react';
import { formatQuantity, formatVnd } from '@mambo/core/format';
import type { ReportFigures, ReportSide } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { monthRange, thisMonth, useBranches, useReportSummary } from '@/data/hooks/useOrg';
import { L } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';
import { useAccess } from '../shared/useAccess';

function Side({ title, side }: { readonly title: string; readonly side: ReportSide }) {
  return (
    <div>
      <p className="mb-1 text-sm font-bold text-ink">{title}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-3">{L.reportCount}</dt>
        <dd className="num text-right text-ink">{side.count}</dd>
        <dt className="text-ink-3">{L.reportWeight}</dt>
        <dd className="num text-right text-ink">{formatQuantity(side.netWeight)}</dd>
        <dt className="text-ink-3">{L.reportAmount}</dt>
        <dd className="num text-right font-bold text-ink">{formatVnd(side.amount)}</dd>
        <dt className="text-ink-3">{L.paid}</dt>
        <dd className="num text-right text-ink">{formatVnd(side.paid)}</dd>
        <dt className="text-ink-3">{L.reportDebt}</dt>
        <dd className={`num text-right font-bold ${side.debt > 0 ? 'text-alert' : 'text-ink'}`}>{formatVnd(side.debt)}</dd>
      </dl>
    </div>
  );
}

const Figures = ({ figures }: { readonly figures: ReportFigures }) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <Side title={L.reportBought} side={figures.purchase} />
    <Side title={L.reportSold} side={figures.sale} />
  </div>
);

/**
 * Báo cáo tổng của doanh nghiệp — server tính bằng @mambo/core trên mọi máy, mọi chi nhánh.
 * Người gắn chi nhánh chỉ thấy chi nhánh mình (server lọc). Cần gói (`reports:org`, D3) — máy chủ cũng chặn.
 */
export function OrgReportPage() {
  const { can } = useAccess();
  const [month, setMonth] = useState(thisMonth);
  const [branchId, setBranchId] = useState('');
  const branches = useBranches(can('branch:manage'));
  const { from, to } = monthRange(month);
  const paid = useEntitlement('reports:org');
  const report = useReportSummary(from, to, branchId || undefined, paid);

  return (
    <PageContainer width="content">
      <PageHeader title={L.navOrgReport} />
      {!paid ? (
        <PlanGate reason={L.gateReports} feature="reports" />
      ) : (
        <div className="grid gap-4">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={L.reportMonth} type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
              {branches.data && branches.data.branches.length > 0 && (
                <Select
                  label={L.reportBranch}
                  value={branchId}
                  options={[
                    { value: '', label: L.reportAllBranches },
                    ...branches.data.branches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                  onValueChange={setBranchId}
                />
              )}
            </div>
          </Card>

          {report.loading && !report.data ? (
            <Skeleton rows={3} label={L.loading} />
          ) : report.error ? (
            <ErrorState
              title={L.errorTitle}
              description={report.error}
              actions={<Button onClick={report.reload}>{L.retry}</Button>}
            />
          ) : report.data ? (
            <>
              <Card title={L.reportAllBranches}>
                <Figures figures={report.data.totals} />
              </Card>
              {!branchId &&
                report.data.branches.length > 1 &&
                report.data.branches.map((b) => (
                  <Card key={b.branch?.id ?? 'none'} title={b.branch?.name ?? L.reportNoBranch}>
                    <Figures figures={b.figures} />
                  </Card>
                ))}
            </>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
