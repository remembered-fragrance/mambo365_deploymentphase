import { useRef, useState } from 'react';
import type { AdminUserRow, AdminUsersQuery } from '@mambo/contracts';
import { formatDate } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { adminErrorMessage, fetchUsers, useAdminRequest } from '@/data/hooks/useAdmin';
import { ORG_TYPE_TEXT, roleText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';
import { phoneText } from './adminText';
import { ResetPasswordCard } from './ResetPasswordCard';
import { UserDetail } from './UserDetail';

const orgsText = (u: AdminUserRow): string =>
  u.memberships.length === 0
    ? '—'
    : u.memberships.map((m) => `${m.organization.name} (${ORG_TYPE_TEXT[m.organization.type].label}, ${roleText(m.organization.type, m.role)})`).join('; ');

const COLUMNS: readonly Column<AdminUserRow>[] = [
  { id: 'name', header: L.adminColName, cell: (u) => u.name, mobile: 'title' },
  { id: 'phone', header: L.adminColPhone, cell: (u) => phoneText(u.phone), numeric: true, mobile: 'secondary' },
  { id: 'username', header: L.adminColUsername, cell: (u) => u.username ?? '—', mobile: 'hidden' },
  { id: 'orgs', header: L.adminColOrgs, cell: orgsText, mobile: 'secondary' },
  { id: 'recovery', header: L.adminColRecovery, cell: (u) => (u.hasVerifiedRecoveryEmail ? L.adminYes : L.adminNo), mobile: 'hidden' },
  { id: 'created', header: L.adminColCreated, cell: (u) => formatDate(u.createdAt), numeric: true, mobile: 'value' },
];

interface MorePages {
  /** Trang thêm thuộc về lượt tìm nào — đổi lượt tìm thì bỏ. */
  readonly of: AdminUsersQuery;
  readonly rows: readonly AdminUserRow[];
  readonly cursor: string | null;
}

/**
 * Tab "Người dùng" (API 0.34.0): mở ra là thấy mọi tài khoản, mới tạo trước, mỗi lần 50, "Xem thêm" đi tiếp bằng
 * `cursor`. Tìm theo số / tên đăng nhập / tên để lọc. Bấm một dòng → chi tiết + nhật ký của tài khoản đó; "Về danh
 * sách" giữ nguyên các trang đã tải. Mỗi lần tải / xem đều ghi nhật ký quản trị.
 */
export function UsersTab({ you }: { readonly you: Readonly<{ id: string; name: string }> }) {
  const [q, setQ] = useState('');
  const [short, setShort] = useState(false);
  const [request, setRequest] = useState<AdminUsersQuery>({});
  const [more, setMore] = useState<MorePages | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const current = useRef(request);
  current.current = request;
  const first = useAdminRequest(request, fetchUsers);

  const extra = more?.of === request ? more : null;
  const rows = [...(first.data?.rows ?? []), ...(extra?.rows ?? [])];
  const cursor = extra ? extra.cursor : (first.data?.cursor ?? null);

  const search = () => {
    const query = q.trim();
    if (query.length === 1) {
      setShort(true);
      return;
    }
    setShort(false);
    setMoreError(null);
    setRequest(query ? { q: query } : {});
  };

  const showAll = () => {
    setQ('');
    setShort(false);
    setMoreError(null);
    setRequest({});
  };

  const loadMore = async () => {
    if (!cursor) return;
    const of = request;
    setMoreLoading(true);
    setMoreError(null);
    try {
      const page = await fetchUsers({ ...of, cursor });
      // Đổi lượt tìm trong lúc chờ → trang này của lượt cũ, bỏ.
      if (current.current !== of) return;
      setMore((prev) => ({ of, rows: [...(prev?.of === of ? prev.rows : []), ...page.rows], cursor: page.cursor ?? null }));
    } catch (err) {
      if (current.current === of) setMoreError(adminErrorMessage(err));
    } finally {
      setMoreLoading(false);
    }
  };

  if (selected) {
    return (
      <UserDetail
        key={selected}
        id={selected}
        you={you}
        onClose={() => {
          setSelected(null);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title={L.adminUsersTitle} subtitle={L.adminLogged}>
        <form
          className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Input
            label={L.adminUsersQuery}
            hint={L.adminUsersQueryHint}
            value={q}
            maxLength={100}
            error={short ? L.adminUsersShort : undefined}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" tone="primary" disabled={first.loading} className="md:mt-7">
            {first.loading ? L.loading : L.adminUsersSearch}
          </Button>
        </form>
        {first.error && (
          <p role="alert" className="mt-3 rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {first.error}
          </p>
        )}
        {first.data && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-3">{request.q ? `${L.adminUsersFound} "${request.q}".` : L.adminUsersAll}</p>
              {request.q && <Button onClick={showAll}>{L.adminUsersShowAll}</Button>}
            </div>
            <DataView
              rows={rows}
              columns={COLUMNS}
              getKey={(u) => u.id}
              caption={L.adminUsersTitle}
              onRowClick={(u) => {
                setSelected(u.id);
                window.scrollTo({ top: 0 });
              }}
              empty={<p className="text-sm text-ink-3">{L.adminUsersEmpty}</p>}
            />
            {rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="num text-sm text-ink-3">
                  {L.adminUsersShown} {rows.length}
                  {cursor ? '' : ` · ${L.adminUsersEnd}`}
                </p>
                {cursor && (
                  <Button onClick={() => void loadMore()} disabled={moreLoading}>
                    {moreLoading ? L.loading : L.adminUsersMore}
                  </Button>
                )}
              </div>
            )}
            {moreError && (
              <p role="alert" className="text-sm font-medium text-alert">
                {moreError}
              </p>
            )}
          </div>
        )}
      </Card>
      <ResetPasswordCard />
    </div>
  );
}
