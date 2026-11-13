import { useState } from 'react';
import { ADMIN_PAYMENTS_MAX, type AdminPaymentRow } from '@mambo/contracts';
import { formatDateTime, formatVnd } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useAdminPayments } from '@/data/hooks/useAdmin';
import { L } from '@/i18n/labels';
import { paymentStatus } from './paymentStatus';

const DEFAULT_DAYS = 30;
const RANGE_OPTIONS = [7, 30, 90].map((days) => ({ value: String(days), label: `${days} ${L.adminFunnelDays}` }));

function Status({ row }: { readonly row: AdminPaymentRow }) {
  const status = paymentStatus(row);
  return <span className={status.needsAction ? 'font-semibold text-alert' : undefined}>{status.text}</span>;
}

// shortcut: thẻ ở điện thoại không có mã chuyển khoản / số phải trả / mã giao dịch, xem đủ cột trên máy tính.
export const PAYMENT_COLUMNS: readonly Column<AdminPaymentRow>[] = [
  { id: 'at', header: L.adminPaymentsAt, cell: (r) => formatDateTime(r.at), numeric: true, mobile: 'secondary' },
  { id: 'org', header: L.adminResultOrg, cell: (r) => r.organization?.name ?? L.adminPaymentsOrgDeleted, mobile: 'title' },
  { id: 'code', header: L.adminPaymentsCode, cell: (r) => r.intent?.code ?? '—', numeric: true, mobile: 'hidden' },
  { id: 'due', header: L.adminPaymentsDue, cell: (r) => (r.intent ? formatVnd(r.intent.amount) : '—'), align: 'right', numeric: true, mobile: 'hidden' },
  { id: 'paid', header: L.adminPaymentsPaid, cell: (r) => (r.bank ? formatVnd(r.bank.amount) : '—'), align: 'right', numeric: true, mobile: 'value' },
  { id: 'bankTx', header: L.adminBankTxId, cell: (r) => r.bank?.bankTxId ?? '—', numeric: true, mobile: 'hidden' },
  { id: 'status', header: L.adminPaymentsStatus, cell: (r) => <Status row={r} />, mobile: 'secondary' },
];

/**
 * Giao dịch mua gói (`GET /v1/admin/payments`): mỗi lần định chuyển khoản và / hoặc mỗi khoản tiền vào một dòng.
 * Chỉ gọi khi bấm "Xem giao dịch" — xem là chạm dữ liệu khách, máy chủ ghi nhật ký từng lần.
 */
export function PaymentsCard() {
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [request, setRequest] = useState<{ readonly days: number } | null>(null);
  const payments = useAdminPayments(request);

  return (
    <Card title={L.adminPaymentsTitle}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-3">{L.adminPaymentsHint}</p>
        <Select
          label={L.adminFunnelRange}
          value={String(days)}
          options={RANGE_OPTIONS}
          onValueChange={(v) => setDays(Number.parseInt(v, 10))}
        />
        <Button onClick={() => setRequest({ days })} disabled={payments.loading}>
          {payments.loading ? L.loading : L.adminPaymentsShow}
        </Button>
        {payments.error && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {payments.error}
          </p>
        )}
        {payments.data && (
          <>
            {payments.data.rows.length >= ADMIN_PAYMENTS_MAX && <p className="text-sm text-ink-3">{L.adminPaymentsCapped}</p>}
            <DataView
              rows={payments.data.rows}
              columns={PAYMENT_COLUMNS}
              getKey={(r) => `${r.intent?.id ?? ''}/${r.bank?.bankTxId ?? ''}`}
              caption={L.adminPaymentsTitle}
              empty={<p className="text-sm text-ink-3">{L.adminPaymentsEmpty}</p>}
            />
          </>
        )}
      </div>
    </Card>
  );
}
