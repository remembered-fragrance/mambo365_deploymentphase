import { useState } from 'react';
import {
  ADMIN_ORGANIZATIONS_MAX,
  type AdminOrganizationRow,
  type AdminOrganizationsQuery,
  type OrgType,
} from '@mambo/contracts';
import { formatDate } from '@mambo/core/format';
import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchOrganizations, useAdminRequest } from '@/data/hooks/useAdmin';
import { ORG_TYPE_TEXT, orgTypeText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';
import { phoneText, planText } from './adminText';
import { OrganizationDetail } from './OrganizationDetail';

const TYPE_OPTIONS = [
  { value: '', label: L.adminOrgsAllTypes },
  ...(['trader', 'farmer', 'enterprise'] as const).map((t) => ({ value: t, label: ORG_TYPE_TEXT[t].label })),
];

const COLUMNS: readonly Column<AdminOrganizationRow>[] = [
  { id: 'name', header: L.adminColName, cell: (r) => r.name, mobile: 'title' },
  { id: 'type', header: L.adminColType, cell: (r) => orgTypeText(r.type, r.plan?.plan), mobile: 'secondary' },
  { id: 'owner', header: L.adminColOwner, cell: (r) => r.owner?.name ?? L.adminNoOwner, mobile: 'hidden' },
  { id: 'phone', header: L.adminColPhone, cell: (r) => phoneText(r.owner?.phone), numeric: true, mobile: 'secondary' },
  { id: 'members', header: L.adminColMembers, cell: (r) => r.members, align: 'right', numeric: true, mobile: 'hidden' },
  { id: 'plan', header: L.adminColPlan, cell: (r) => planText(r.plan), mobile: 'value' },
  { id: 'created', header: L.adminColCreated, cell: (r) => formatDate(r.createdAt), numeric: true, mobile: 'hidden' },
];

interface OrganizationsTabProps {
  /** "Mở gói tay cho tổ chức này" — trang chuyển sang tab Thanh toán, điền sẵn mã tổ chức. */
  readonly onActivate: (organizationId: string) => void;
}

/**
 * Tab "Tổ chức": tìm → bảng → bấm một dòng xem chi tiết. Tìm và xem chi tiết đều ghi nhật ký quản trị, nên chỉ gọi khi
 * người quản trị bấm — mở tab không tự tải danh sách.
 */
export function OrganizationsTab({ onActivate }: OrganizationsTabProps) {
  const [q, setQ] = useState('');
  const [type, setType] = useState<OrgType | ''>('');
  const [request, setRequest] = useState<AdminOrganizationsQuery | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const list = useAdminRequest(request, fetchOrganizations);

  const search = () => {
    setSelected(null);
    setRequest({ ...(q.trim() ? { q: q.trim() } : {}), ...(type ? { type } : {}) });
  };

  // Xem chi tiết thì thay chỗ danh sách (không bắt cuộn qua cả danh sách); "Về danh sách" giữ nguyên kết quả tìm.
  if (selected) {
    return (
      <OrganizationDetail
        key={selected}
        id={selected}
        onClose={() => {
          setSelected(null);
          window.scrollTo({ top: 0 });
        }}
        onActivate={onActivate}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title={L.adminOrgsTitle} subtitle={L.adminLogged}>
        <form
          className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_14rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Input label={L.adminOrgsQuery} hint={L.adminOrgsQueryHint} value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
          <Select label={L.adminOrgsType} value={type} options={TYPE_OPTIONS} onValueChange={(v) => setType(v as OrgType | '')} />
          <Button type="submit" tone="primary" disabled={list.loading} className="md:mt-7">
            {list.loading ? L.loading : L.adminOrgsSearch}
          </Button>
        </form>
        {list.error && (
          <p role="alert" className="mt-3 rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {list.error}
          </p>
        )}
        {list.data && (
          <div className="mt-3 flex flex-col gap-2">
            {list.data.rows.length >= ADMIN_ORGANIZATIONS_MAX && <p className="text-sm text-ink-3">{L.adminOrgsCapped}</p>}
            {list.data.rows.length > 0 && <p className="text-sm text-ink-3">{L.adminOrgsPick}</p>}
            <DataView
              rows={list.data.rows}
              columns={COLUMNS}
              getKey={(r) => r.id}
              caption={L.adminOrgsTitle}
              onRowClick={(r) => {
                setSelected(r.id);
                window.scrollTo({ top: 0 });
              }}
              empty={<p className="text-sm text-ink-3">{L.adminOrgsEmpty}</p>}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
