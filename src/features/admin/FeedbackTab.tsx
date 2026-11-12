import { useState } from 'react';
import { ADMIN_FEEDBACK_MAX, type AdminFeedbackRow } from '@mambo/contracts';
import { formatDateTime } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { fetchFeedback, useAdminRequest } from '@/data/hooks/useAdmin';
import { L } from '@/i18n/labels';

const RANGE_OPTIONS = [7, 30, 90, 365].map((days) => ({ value: String(days), label: `${days} ${L.adminFunnelDays}` }));

const load = (request: { readonly days: number }) => fetchFeedback(request.days);

const COLUMNS: readonly Column<AdminFeedbackRow>[] = [
  { id: 'at', header: L.adminPaymentsAt, cell: (r) => formatDateTime(r.createdAt), numeric: true, mobile: 'secondary' },
  { id: 'rating', header: L.adminColRating, cell: (r) => `${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}`, mobile: 'value' },
  { id: 'comment', header: L.adminColComment, cell: (r) => r.comment ?? L.adminNoComment, mobile: 'title' },
  { id: 'org', header: L.adminResultOrg, cell: (r) => r.organization?.name ?? L.adminPaymentsOrgDeleted, mobile: 'secondary' },
  { id: 'from', header: L.adminColFrom, cell: (r) => (r.user ? `${r.user.name}${r.user.phone ? ` · ${r.user.phone}` : ''}` : '—'), mobile: 'hidden' },
  { id: 'app', header: L.adminColApp, cell: (r) => [r.platform, r.appVersion].filter(Boolean).join(' '), mobile: 'hidden' },
];

/** Tab "Phản hồi": chỉ gọi khi bấm xem — máy chủ ghi nhật ký `list-feedback` mỗi lần. */
export function FeedbackTab() {
  const [days, setDays] = useState(30);
  const [request, setRequest] = useState<{ readonly days: number } | null>(null);
  const feedback = useAdminRequest(request, load);

  return (
    <Card title={L.adminFeedbackTitle} subtitle={L.adminLogged}>
      <div className="flex flex-col gap-3">
        <Select label={L.adminFunnelRange} value={String(days)} options={RANGE_OPTIONS} onValueChange={(v) => setDays(Number.parseInt(v, 10))} />
        <Button tone="primary" onClick={() => setRequest({ days })} disabled={feedback.loading}>
          {feedback.loading ? L.loading : L.adminFeedbackShow}
        </Button>
        {feedback.error && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {feedback.error}
          </p>
        )}
        {feedback.data && (
          <>
            {feedback.data.rows.length >= ADMIN_FEEDBACK_MAX && <p className="text-sm text-ink-3">{L.adminFeedbackCapped}</p>}
            <DataView
              rows={feedback.data.rows}
              columns={COLUMNS}
              getKey={(r) => r.id}
              caption={L.adminFeedbackTitle}
              empty={<p className="text-sm text-ink-3">{L.adminFeedbackEmpty}</p>}
            />
          </>
        )}
      </div>
    </Card>
  );
}
