import { useState } from 'react';
import type { AdminAccessLogRow } from '@mambo/contracts';
import { formatDateTime } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { fetchAccessLog, useAdminRequest } from '@/data/hooks/useAdmin';
import { L } from '@/i18n/labels';
import { actionText, reasonText } from './adminText';

const load = () => fetchAccessLog();

/** Nhật ký ghi id tài khoản quản trị — id của chính người đang xem đổi thành "<tên> (bạn)". */
const columnsFor = (you: Readonly<{ id: string; name: string }>): readonly Column<AdminAccessLogRow>[] => [
  { id: 'at', header: L.adminPaymentsAt, cell: (r) => formatDateTime(r.createdAt), numeric: true, mobile: 'secondary' },
  { id: 'action', header: L.adminColAction, cell: (r) => actionText(r.action), mobile: 'title' },
  { id: 'org', header: L.adminResultOrg, cell: (r) => r.organization?.name ?? '—', mobile: 'secondary' },
  {
    id: 'operator',
    header: L.adminColOperator,
    cell: (r) => (you.id ? r.operator.replace(you.id, `${you.name} (${L.adminYou})`) : r.operator),
    mobile: 'hidden',
  },
  { id: 'reason', header: L.adminColReason, cell: (r) => reasonText(r.reason), mobile: 'value' },
];

/** Tab "Nhật ký": đọc nhật ký quản trị — máy chủ không ghi thêm dòng nào khi xem, nên mở tab là tải. */
export function AccessLogTab({ you }: { readonly you: Readonly<{ id: string; name: string }> }) {
  const [request, setRequest] = useState<object>({});
  const log = useAdminRequest(request, load);

  return (
    <Card
      title={L.adminLogTitle}
      subtitle={L.adminLogHint}
      action={
        <Button onClick={() => setRequest({})} disabled={log.loading}>
          {L.adminRefresh}
        </Button>
      }
    >
      {log.error && (
        <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
          {log.error}
        </p>
      )}
      <DataView
        rows={log.data?.rows ?? []}
        columns={columnsFor(you)}
        getKey={(r) => r.id}
        caption={L.adminLogTitle}
        empty={<p className="text-sm text-ink-3">{log.loading ? L.loading : L.adminLogEmpty}</p>}
      />
    </Card>
  );
}
