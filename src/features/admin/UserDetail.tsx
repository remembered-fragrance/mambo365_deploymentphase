import { useMemo, useState } from 'react';
import type { AdminUserEvent, AdminUserEventKind, AdminUserMembership } from '@mambo/contracts';
import { formatDate, formatDateTime } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchUser, renameUser, useAdminRequest } from '@/data/hooks/useAdmin';
import { ORG_TYPE_TEXT, roleText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';
import { MEMBER_STATUS_TEXT, phoneText } from './adminText';
import { RenameForm } from './RenameForm';
import { ResetPasswordCard } from './ResetPasswordCard';
import {
  KIND_TEXT,
  KINDS,
  type TimelineFilter,
  countByKind,
  dayHeading,
  eventLines,
  eventTitle,
  filterEvents,
  groupByDay,
  vnTime,
} from './userTimeline';

interface Props {
  readonly id: string;
  /** Tài khoản quản trị đang đăng nhập — mã của nó trong "Người duyệt" đổi thành tên (bạn). */
  readonly you: Readonly<{ id: string; name: string }>;
  readonly onClose: () => void;
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="m-0 font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** Màu nhãn nhóm — kèm chữ, không chỉ dựa vào màu. */
const KIND_CLASS: Readonly<Record<AdminUserEventKind, string>> = {
  work: 'border-brand text-brand',
  organization: 'border-enterprise text-enterprise',
  account: 'border-rule text-ink-2',
  admin: 'border-alert text-alert',
};

const MEMBERSHIP_COLUMNS: readonly Column<AdminUserMembership>[] = [
  { id: 'org', header: L.adminColOrgs, cell: (m) => m.organization.name, mobile: 'title' },
  { id: 'type', header: L.adminColType, cell: (m) => ORG_TYPE_TEXT[m.organization.type].label, mobile: 'hidden' },
  { id: 'role', header: L.adminColRole, cell: (m) => roleText(m.organization.type, m.role), mobile: 'secondary' },
  { id: 'status', header: L.adminColStatus, cell: (m) => MEMBER_STATUS_TEXT[m.status], mobile: 'badge' },
  { id: 'branch', header: L.adminColBranch, cell: (m) => m.branch ?? '—', mobile: 'hidden' },
  // Trên điện thoại số đứng một mình không rõ là gì — số phiếu / lần trả đã có ở ô tổng phía trên.
  { id: 'receipts', header: L.adminUserReceipts, cell: (m) => m.receipts, align: 'right', numeric: true, mobile: 'hidden' },
  { id: 'payments', header: L.adminUserPayments, cell: (m) => m.payments, align: 'right', numeric: true, mobile: 'hidden' },
  {
    id: 'last',
    header: L.adminUserLastActivity,
    cell: (m) => (m.lastActivityAt ? formatDateTime(m.lastActivityAt) : L.adminUserNever),
    numeric: true,
    mobile: 'secondary',
  },
  { id: 'joined', header: L.adminColJoined, cell: (m) => formatDate(m.joinedAt), numeric: true, mobile: 'hidden' },
];

function EventRow({ event, you }: { readonly event: AdminUserEvent; readonly you: Props['you'] }) {
  const lines = eventLines(event).map((line) => (you.id ? line.replace(you.id, `${you.name} (${L.adminYou})`) : line));
  return (
    <li className="grid grid-cols-[3.25rem_1fr] gap-3 py-2.5">
      <span className="num pt-0.5 text-sm text-ink-3">{vnTime(event.at)}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`rounded-full border px-2 text-xs font-semibold ${KIND_CLASS[event.kind]}`}>{KIND_TEXT[event.kind]}</span>
          <span className="font-semibold text-ink">{eventTitle(event)}</span>
        </div>
        {event.organization && <p className="mt-0.5 text-sm text-ink-2">{event.organization.name}</p>}
        {lines.map((line) => (
          <p key={line} className="text-sm text-ink-3">
            {line}
          </p>
        ))}
      </div>
    </li>
  );
}

/**
 * Chi tiết một tài khoản (`GET /v1/admin/users/:id` — ghi nhật ký `view-user`): hồ sơ, tổ chức kèm mức làm việc, và nhật
 * ký gộp theo ngày. Lọc theo nhóm (sổ sách, tổ chức & người, tài khoản, quản trị viên) và theo tổ chức.
 */
export function UserDetail({ id, you, onClose }: Props) {
  // `id` không đổi suốt vòng đời (nơi dùng đặt `key={id}`) → đúng một lời gọi.
  const detail = useAdminRequest(id, fetchUser);
  const [kind, setKind] = useState<TimelineFilter>('all');
  const [orgId, setOrgId] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  // Tên vừa sửa ở đây — lời gọi chi tiết không chạy lại (mỗi lần xem là một dòng nhật ký).
  const [renamed, setRenamed] = useState<string | null>(null);
  const d = detail.data;

  const counts = useMemo(() => countByKind(d?.timeline ?? []), [d]);
  const groups = useMemo(() => groupByDay(filterEvents(d?.timeline ?? [], kind, orgId)), [d, kind, orgId]);

  const totals = d?.memberships.reduce(
    (acc, m) => ({
      receipts: acc.receipts + m.receipts,
      payments: acc.payments + m.payments,
      last: m.lastActivityAt && (!acc.last || m.lastActivityAt > acc.last) ? m.lastActivityAt : acc.last,
    }),
    { receipts: 0, payments: 0, last: null as string | null },
  );
  const orgOptions = [
    { value: '', label: L.adminUserOrgAll },
    ...(d?.memberships ?? []).map((m) => ({ value: m.organization.id, label: m.organization.name })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={renamed ?? d?.name ?? L.adminUserTitle}
        subtitle={d ? phoneText(d.phone) : undefined}
        action={<Button onClick={onClose}>{L.adminBackToList}</Button>}
      >
        {detail.error && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {detail.error}
          </p>
        )}
        {!d && !detail.error && <Skeleton rows={4} label={L.loading} />}
        {d && totals && (
          <div className="flex flex-col gap-5">
            <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Fact label={L.adminUserReceipts} value={String(totals.receipts)} />
              <Fact label={L.adminUserPayments} value={String(totals.payments)} />
              <Fact label={L.adminUserLastActivity} value={totals.last ? formatDateTime(totals.last) : L.adminUserNever} />
              <Fact label={L.adminColCreated} value={formatDate(d.createdAt)} />
            </dl>
            <dl className="m-0 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Fact label={L.adminColUsername} value={d.username ?? '—'} />
              <Fact label={L.adminColRecovery} value={d.hasVerifiedRecoveryEmail ? L.adminYes : L.adminNo} />
              <Fact label={L.adminUserId} value={d.id} />
            </dl>
            <RenameForm
              current={renamed ?? d.name}
              maxLength={80}
              label={L.adminRenameUserLabel}
              save={(input) => renameUser(d.id, input)}
              onRenamed={setRenamed}
            />
            <div>
              {d.hasVerifiedRecoveryEmail ? (
                <p className="text-sm text-ink-3">{L.adminUsersSelfReset}</p>
              ) : (
                d.phone && <Button onClick={() => setResetOpen((open) => !open)}>{L.adminUsersReset}</Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {d && resetOpen && d.phone && <ResetPasswordCard initialPhone={d.phone} />}

      {d && (
        <Card title={L.adminUserOrgs}>
          <DataView
            rows={d.memberships}
            columns={MEMBERSHIP_COLUMNS}
            getKey={(m) => m.organization.id}
            caption={L.adminUserOrgs}
            empty={<p className="text-sm text-ink-3">{L.adminUserNoOrgs}</p>}
          />
        </Card>
      )}

      {d && (
        <Card title={L.adminUserTimeline} subtitle={L.adminUserTimelineHint}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label={L.adminUserTimeline}>
              <Chip label={`${L.adminUserFilterAll} (${d.timeline.length})`} selected={kind === 'all'} onSelect={() => setKind('all')} />
              {KINDS.filter((k) => counts[k] > 0).map((k) => (
                <Chip key={k} label={`${KIND_TEXT[k]} (${counts[k]})`} selected={kind === k} onSelect={() => setKind(k)} />
              ))}
            </div>
            {d.memberships.length > 1 && (
              <div className="max-w-sm">
                <Select label={L.adminUserOrgFilter} value={orgId} options={orgOptions} onValueChange={setOrgId} />
              </div>
            )}
            {d.timelineTruncated && <p className="text-sm text-ink-3">{L.adminUserTimelineCapped}</p>}
            {groups.length === 0 ? (
              <p className="text-sm text-ink-3">{L.adminUserTimelineEmpty}</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {groups.map((g) => (
                  <li key={g.key}>
                    <h3 className="border-b border-rule pb-1 text-sm font-bold text-ink-2">{dayHeading(g.key)}</h3>
                    <ul className="m-0 list-none divide-y divide-rule p-0">
                      {g.events.map((e, i) => (
                        <EventRow key={`${e.at}-${e.action}-${i}`} event={e} you={you} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
