import { useState } from 'react';
import type { AdminUserRow } from '@mambo/contracts';
import { formatDate } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { fetchUsers, useAdminRequest } from '@/data/hooks/useAdmin';
import { ORG_TYPE_TEXT, roleText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';
import { ResetPasswordCard } from './ResetPasswordCard';

const load = (request: { readonly q: string }) => fetchUsers(request.q);

const orgsText = (u: AdminUserRow): string =>
  u.memberships.length === 0
    ? '—'
    : u.memberships.map((m) => `${m.organization.name} (${ORG_TYPE_TEXT[m.organization.type].label}, ${roleText(m.organization.type, m.role)})`).join('; ');

const userColumns = (onReset: (phone: string) => void): readonly Column<AdminUserRow>[] => [
  { id: 'name', header: L.adminColName, cell: (u) => u.name, mobile: 'title' },
  { id: 'phone', header: L.adminColPhone, cell: (u) => u.phone ?? '—', numeric: true, mobile: 'secondary' },
  { id: 'username', header: L.adminColUsername, cell: (u) => u.username ?? '—', mobile: 'hidden' },
  { id: 'orgs', header: L.adminColOrgs, cell: orgsText, mobile: 'secondary' },
  { id: 'recovery', header: L.adminColRecovery, cell: (u) => (u.hasVerifiedRecoveryEmail ? L.adminYes : L.adminNo), mobile: 'hidden' },
  { id: 'created', header: L.adminColCreated, cell: (u) => formatDate(u.createdAt), numeric: true, mobile: 'hidden' },
  {
    id: 'reset',
    header: '',
    cell: (u) =>
      u.hasVerifiedRecoveryEmail ? (
        <span className="text-sm text-ink-3">{L.adminUsersSelfReset}</span>
      ) : u.phone ? (
        <Button onClick={() => onReset(u.phone ?? '')}>{L.adminUsersReset}</Button>
      ) : null,
    mobile: 'value',
  },
];

/**
 * Tab "Người dùng": tìm theo số / tên đăng nhập / tên (ghi nhật ký `search-users`, chỉ gọi khi bấm), và đặt lại mật
 * khẩu. Người có email khôi phục đã xác nhận thì tự đặt lại — không có nút đặt hộ.
 */
export function UsersTab() {
  const [q, setQ] = useState('');
  const [short, setShort] = useState(false);
  const [request, setRequest] = useState<{ readonly q: string } | null>(null);
  const [resetPhone, setResetPhone] = useState('');
  const users = useAdminRequest(request, load);

  const search = () => {
    const query = q.trim();
    setShort(query.length < 2);
    if (query.length >= 2) setRequest({ q: query });
  };

  const columns = userColumns(setResetPhone);

  return (
    <div className="flex flex-col gap-4">
      <Card title={L.adminUsersTitle} subtitle={L.adminLogged}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Input
            label={L.adminUsersQuery}
            value={q}
            maxLength={100}
            error={short ? L.adminUsersShort : undefined}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" tone="primary" disabled={users.loading}>
            {users.loading ? L.loading : L.adminUsersSearch}
          </Button>
        </form>
        {users.error && (
          <p role="alert" className="mt-3 rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {users.error}
          </p>
        )}
        {users.data && (
          <div className="mt-3">
            <DataView
              rows={users.data.rows}
              columns={columns}
              getKey={(u) => u.id}
              caption={L.adminUsersTitle}
              empty={<p className="text-sm text-ink-3">{L.adminUsersEmpty}</p>}
            />
          </div>
        )}
      </Card>
      <ResetPasswordCard key={resetPhone} initialPhone={resetPhone} />
    </div>
  );
}
