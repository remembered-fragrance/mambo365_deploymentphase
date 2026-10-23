import { type ChangeEvent } from 'react';
import type { OrgType } from '@mambo/contracts';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { ownerRoleLabel } from '@/i18n/profileLabels';

export function DashboardHeader() {
  const { currentOrg, memberships, selectOrg, userRole, user, orgType } = useStore();

  const orgName = currentOrg?.organization.name ?? user?.businessName ?? user?.name ?? L.appName;
  const branchName = currentOrg?.branch?.name;

  const roleText =
    userRole === 'owner'
      ? ownerRoleLabel(orgType)
      : userRole === 'manager'
        ? L.roleManager
        : userRole === 'staff'
          ? L.roleStaff
          : undefined;

  const handleOrgChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value;
    if (orgId && orgId !== currentOrg?.organization.id) {
      void selectOrg(orgId);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {orgName}
        </h1>
        {roleText && (
          <Badge
            label={roleText}
            tone={userRole === 'owner' ? 'in' : 'neutral'}
          />
        )}
        {branchName && (
          <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-2">
            {L.branchLabel}: {branchName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {memberships.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <label htmlFor="dashboard-org-select" className="sr-only">
              {L.orgSwitch}
            </label>
            <select
              id="dashboard-org-select"
              value={currentOrg?.organization.id ?? ''}
              onChange={handleOrgChange}
              className="rounded-lg border border-rule bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
            >
              {memberships.map((m) => (
                <option key={m.organization.id} value={m.organization.id}>
                  {m.organization.name} ({orgTypeLabel(m.organization.type)})
                </option>
              ))}
            </select>
          </div>
        )}
        <HelpButton topic="dashboard" />
      </div>
    </div>
  );
}

function orgTypeLabel(type: OrgType) {
  if (type === 'farmer') return L.supplier;
  if (type === 'trader') return L.roleOwner;
  return L.buyer;
}
