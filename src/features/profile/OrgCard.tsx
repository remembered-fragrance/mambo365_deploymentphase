import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ORG_TYPE_TEXT, roleText } from '../shared/roleText';

/**
 * Tổ chức đang làm việc: loại (vỏ giao diện), vai trò, chi nhánh. Thuộc nhiều tổ
 * chức thì đổi ở đây (FRONTEND.md §5.3). Chưa có tổ chức (sổ của máy) thì ẩn.
 */
export function OrgCard() {
  const { currentOrg, memberships, selectOrg } = useStore();
  if (!currentOrg) return null;

  const { organization, role, branch } = currentOrg;

  return (
    <Card title={L.orgCardTitle}>
      <p className="text-lg font-bold text-ink">{organization.name}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-3">{L.orgCardType}</dt>
        <dd className="font-semibold text-ink">{ORG_TYPE_TEXT[organization.type].label}</dd>
        <dt className="text-ink-3">{L.orgCardRole}</dt>
        <dd className="font-semibold text-ink">{roleText(organization.type, role)}</dd>
        {branch && (
          <>
            <dt className="text-ink-3">{L.orgCardBranch}</dt>
            <dd className="font-semibold text-ink">{branch.name}</dd>
          </>
        )}
      </dl>

      {memberships.length > 1 && (
        <div className="mt-3">
          <Select
            label={L.orgCardSwitch}
            value={organization.id}
            options={memberships.map((m) => ({
              value: m.organization.id,
              label: `${m.organization.name} · ${roleText(m.organization.type, m.role)}`,
            }))}
            onValueChange={(id) => void selectOrg(id)}
          />
        </div>
      )}
    </Card>
  );
}
