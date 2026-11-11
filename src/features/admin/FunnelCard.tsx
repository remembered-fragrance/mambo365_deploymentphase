import type { AdminFunnel } from '@mambo/contracts';
import { formatDate } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import type { FunnelState } from '@/data/hooks/useAdmin';
import { ORG_TYPE_TEXT } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';

type Row = AdminFunnel['rows'][number];

const RANGE_OPTIONS = [7, 30, 90].map((days) => ({ value: String(days), label: `${days} ${L.adminFunnelDays}` }));

// shortcut: thẻ ở điện thoại không có số tổ chức / số máy (DataView chỉ có một ô số), xem đủ cột trên máy tính.
const COLUMNS: readonly Column<Row>[] = [
  { id: 'name', header: L.adminFunnelEvent, cell: (r) => r.name, mobile: 'title' },
  {
    id: 'orgType',
    header: L.adminFunnelOrgType,
    cell: (r) => (r.orgType ? ORG_TYPE_TEXT[r.orgType].label : L.adminFunnelAnon),
    mobile: 'secondary',
  },
  { id: 'events', header: L.adminFunnelEvents, cell: (r) => r.events, align: 'right', numeric: true, mobile: 'value' },
  { id: 'organizations', header: L.adminFunnelOrgs, cell: (r) => r.organizations, align: 'right', numeric: true, mobile: 'hidden' },
  { id: 'devices', header: L.adminFunnelDevices, cell: (r) => r.devices, align: 'right', numeric: true, mobile: 'hidden' },
  { id: 'firstAt', header: L.adminFunnelFirst, cell: (r) => formatDate(r.firstAt), numeric: true, mobile: 'hidden' },
  { id: 'lastAt', header: L.adminFunnelLast, cell: (r) => formatDate(r.lastAt), numeric: true, mobile: 'secondary' },
];

interface FunnelCardProps {
  readonly funnel: FunnelState;
  readonly days: number;
  readonly onDaysChange: (days: number) => void;
}

/** Phễu đo lường (`GET /v1/admin/funnel`): mỗi (loại tài khoản, sự kiện) một dòng số — không biểu đồ. */
export function FunnelCard({ funnel, days, onDaysChange }: FunnelCardProps) {
  return (
    <Card title={L.adminFunnelTitle}>
      <div className="flex flex-col gap-3">
        <Select
          label={L.adminFunnelRange}
          value={String(days)}
          options={RANGE_OPTIONS}
          onValueChange={(v) => onDaysChange(Number.parseInt(v, 10))}
        />
        {funnel.error ? (
          <div className="flex flex-col gap-2">
            <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
              {funnel.error}
            </p>
            <Button onClick={funnel.reload}>{L.retry}</Button>
          </div>
        ) : (
          <DataView
            rows={funnel.data?.rows ?? []}
            columns={COLUMNS}
            getKey={(r) => `${r.orgType ?? ''}/${r.name}`}
            caption={L.adminFunnelTitle}
            empty={<p className="text-sm text-ink-3">{funnel.loading ? L.loading : L.adminFunnelEmpty}</p>}
          />
        )}
      </div>
    </Card>
  );
}
