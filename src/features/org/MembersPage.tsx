import { useState } from 'react';
import { formatPhoneVn, normalizePhone } from '@mambo/core/identifier';
import type { AssignableRole, MemberRole, OrgMember } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { createMember, orgErrorMessage, removeMember, updateMember, useBranches, useMembers } from '@/data/hooks/useOrg';
import { L } from '@/i18n/labels';
import { useAccess } from '../shared/useAccess';

const ROLE_LABEL: Record<MemberRole, string> = { owner: L.roleOwner, manager: L.roleManager, staff: L.roleStaff };

/**
 * Chủ tạo tài khoản cho người của mình (FRONTEND §5.9). Vựa chỉ thêm người cân (`staff`);
 * doanh nghiệp thêm quản lý / nhân viên và gắn chi nhánh. Không có nút trên dòng của chủ và của chính mình.
 */
export function MembersPage() {
  const { orgType, can } = useAccess();
  const enterprise = orgType === 'enterprise';
  const members = useMembers();
  const branches = useBranches(enterprise && can('branch:manage'));
  const toast = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AssignableRole>('staff');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<OrgMember | null>(null);

  const branchOptions = [
    { value: '', label: L.memberBranchAll },
    ...(branches.data?.branches ?? []).filter((b) => !b.archived).map((b) => ({ value: b.id, label: b.name })),
  ];

  const add = async () => {
    setBusy(true);
    setError(undefined);
    // Số từng bị gỡ khỏi tổ chức này được bật lại với tài khoản và mật khẩu CŨ — phải nói cho chủ biết.
    const e164 = normalizePhone(phone);
    const comingBack = members.data?.some((m) => m.status === 'removed' && m.phone === e164);
    try {
      await createMember({
        name: name.trim(),
        phone,
        password,
        role: enterprise ? role : 'staff',
        branchId: enterprise && branchId ? branchId : null,
      });
      toast({ message: comingBack ? L.memberReactivated : L.memberAdded });
      setName('');
      setPhone('');
      setPassword('');
      members.reload();
    } catch (err) {
      setError(orgErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      toast({ message: done });
    } catch (err) {
      toast({ message: orgErrorMessage(err), tone: 'alert' });
    }
    members.reload();
  };

  return (
    <PageContainer width="content">
      <PageHeader title={L.navMembers} />
      <div className="grid gap-4">
        <Card title={L.memberAdd} subtitle={L.memberAddHint}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Input label={L.memberName} value={name} required maxLength={80} onChange={(e) => setName(e.target.value)} />
            <Input
              label={L.memberPhone}
              value={phone}
              required
              inputMode="tel"
              autoComplete="off"
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label={L.memberPassword}
              value={password}
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            {enterprise && (
              <>
                <Select
                  label={L.memberRole}
                  value={role}
                  options={[
                    { value: 'staff', label: L.roleStaff },
                    { value: 'manager', label: L.roleManager },
                  ]}
                  onValueChange={(v) => setRole(v as AssignableRole)}
                />
                <Select label={L.memberBranch} value={branchId} options={branchOptions} onValueChange={setBranchId} />
              </>
            )}
            {error && <p className="text-sm text-alert">{error}</p>}
            <Button type="submit" tone="primary" block disabled={busy}>
              {L.memberAdd}
            </Button>
          </form>
        </Card>

        {members.loading && !members.data ? (
          <Skeleton rows={3} label={L.loading} />
        ) : members.error ? (
          <ErrorState
            title={L.errorTitle}
            description={members.error}
            actions={<Button onClick={members.reload}>{L.retry}</Button>}
          />
        ) : (members.data ?? []).length <= 1 ? (
          <EmptyState title={L.membersEmpty} icon="👥" />
        ) : (
          <ul className="flex flex-col gap-2">
            {(members.data ?? []).map((m) => {
              const editable = m.role !== 'owner' && !m.isMe && m.status !== 'removed';
              return (
                <li key={m.id} className={`card flex flex-col gap-2 p-4 ${m.status === 'removed' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">
                        {m.name ?? '—'} {m.isMe && <span className="font-normal text-ink-3">{L.memberMe}</span>}
                      </p>
                      <p className="num text-sm text-ink-2">{m.phone ? formatPhoneVn(m.phone) : '—'}</p>
                    </div>
                    <Badge
                      label={m.status === 'removed' ? L.memberRemovedTag : ROLE_LABEL[m.role]}
                      tone={m.role === 'owner' ? 'in' : 'neutral'}
                    />
                  </div>
                  {!editable && m.branch && <p className="text-sm text-ink-3">{m.branch.name}</p>}
                  {editable && (
                    <div className="flex flex-wrap items-end gap-2">
                      {enterprise && (
                        <>
                          <Select
                            label={L.memberRole}
                            value={m.role}
                            options={[
                              { value: 'staff', label: L.roleStaff },
                              { value: 'manager', label: L.roleManager },
                            ]}
                            onValueChange={(v) =>
                              void run(() => updateMember(m.id, { role: v as AssignableRole }), L.memberSaved)
                            }
                          />
                          <Select
                            label={L.memberBranch}
                            value={m.branch?.id ?? ''}
                            options={branchOptions}
                            onValueChange={(v) => void run(() => updateMember(m.id, { branchId: v || null }), L.memberSaved)}
                          />
                        </>
                      )}
                      <Button tone="danger" onClick={() => setRemoving(m)}>
                        {L.memberRemove}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={`${L.memberRemove} ${removing?.name ?? ''}`}
        consequence={L.memberRemoveConsequence}
        confirmLabel={L.memberRemove}
        onConfirm={() => {
          const m = removing;
          setRemoving(null);
          if (m) void run(() => removeMember(m.id), L.memberRemoved);
        }}
        onCancel={() => setRemoving(null)}
      />
    </PageContainer>
  );
}
