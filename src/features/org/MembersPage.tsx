import { useState } from 'react';
import { formatDate, formatVnd } from '@mambo/core/format';
import { formatPhoneVn, normalizePhone } from '@mambo/core/identifier';
import type { AssignableRole, MemberActivity, MemberRole, OrgMember } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PlusIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  createMember,
  monthRange,
  orgErrorMessage,
  removeMember,
  thisMonth,
  updateMember,
  useBranches,
  useMemberActivity,
  useMembers,
} from '@/data/hooks/useOrg';
import { MAX_PASSWORD_LENGTH } from '@/config';
import { L } from '@/i18n/labels';
import { passwordProblem } from '../shared/password';
import { useAccess } from '../shared/useAccess';

const ROLE_LABEL: Record<MemberRole, string> = { owner: L.roleOwner, manager: L.roleManager, staff: L.roleStaff };

const receiptCount = (a: MemberActivity | undefined): number => (a ? a.receipts.purchase.count + a.receipts.sale.count : 0);

function Kpi({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="card flex flex-col p-3">
      <span className="text-xs font-semibold text-ink-3">{label}</span>
      <span className="num mt-1 text-lg font-extrabold text-ink">{value}</span>
    </div>
  );
}

/** Việc của một người trong tháng — số phiếu, tiền mua / bán, lần ghi trả, lần làm gần nhất. */
function ActivityLine({ activity }: { readonly activity: MemberActivity | undefined }) {
  if (!activity) return null;
  const { purchase, sale } = activity.receipts;
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-ink-3">{L.membersReceipts}</dt>
        <dd className="num text-ink">
          {purchase.count} {L.memberBuyCount}
          {sale.count > 0 && ` · ${sale.count} ${L.memberSellCount}`}
        </dd>
      </div>
      <div>
        <dt className="text-ink-3">{L.membersBought}</dt>
        <dd className="num font-bold text-ink">{formatVnd(purchase.amount)}</dd>
      </div>
      <div>
        <dt className="text-ink-3">{L.membersPayments}</dt>
        <dd className="num text-ink">
          {activity.payments.count} {L.memberPaymentsCount}
          {activity.payments.count > 0 && ` · ${formatVnd(activity.payments.amount)}`}
        </dd>
      </div>
      <div>
        <dt className="text-ink-3">{L.memberLastActive}</dt>
        <dd className="num text-ink">{activity.lastActiveAt ? formatDate(activity.lastActiveAt) : L.memberNeverActive}</dd>
      </div>
    </dl>
  );
}

/**
 * Quản lý nhân viên của chủ (FRONTEND §5.9): ai đang làm, mỗi người làm được gì trong tháng, thêm /
 * đổi vai trò / gỡ. Vựa chỉ thêm người cân (`staff`); doanh nghiệp thêm quản lý / nhân viên và gắn
 * chi nhánh. Người làm không tự rời được — chỉ chủ gỡ ra ở đây. Không có nút trên dòng của chủ và của chính mình.
 */
export function MembersPage() {
  const { orgType, can } = useAccess();
  const enterprise = orgType === 'enterprise';
  const members = useMembers();
  const branches = useBranches(enterprise && can('branch:manage'));
  const toast = useToast();

  const [month, setMonth] = useState(thisMonth);
  const [branchFilter, setBranchFilter] = useState('');
  const { from, to } = monthRange(month);
  const activity = useMemberActivity(from, to);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AssignableRole>('staff');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<OrgMember | null>(null);

  const liveBranches = (branches.data?.branches ?? []).filter((b) => !b.archived);
  const branchOptions = [{ value: '', label: L.memberBranchAll }, ...liveBranches.map((b) => ({ value: b.id, label: b.name }))];

  const byId = new Map((activity.data?.members ?? []).map((a) => [a.member.id, a]));
  const shown = (members.data ?? []).filter((m) => !branchFilter || m.branch?.id === branchFilter);
  const working = shown.filter((m) => m.status === 'active');
  const sum = (pick: (a: MemberActivity) => number) =>
    shown.reduce((total, m) => {
      const a = byId.get(m.id);
      return a ? total + pick(a) : total;
    }, 0);

  const add = async () => {
    // Cùng luật với đăng ký (tên, SĐT, mật khẩu 8–72) — báo bằng câu của app, không phải câu của trình duyệt.
    const e164 = normalizePhone(phone);
    const problem = !name.trim() ? L.authNameRequired : !e164 ? L.authPhoneInvalid : passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(undefined);
    // Số từng bị gỡ khỏi tổ chức này được bật lại với tài khoản và mật khẩu CŨ — phải nói cho chủ biết.
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
      setAdding(false);
      members.reload();
      activity.reload();
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
    activity.reload();
  };

  return (
    <PageContainer width="content">
      <PageHeader
        title={L.navMembers}
        actions={
          <Button tone="primary" onClick={() => setAdding(true)}>
            <PlusIcon className="h-4 w-4" />
            {L.memberAdd}
          </Button>
        }
      />
      <div className="grid gap-4">
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={L.reportMonth} type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            {liveBranches.length > 0 && (
              <Select
                label={L.memberBranch}
                value={branchFilter}
                options={[{ value: '', label: L.memberFilterAll }, ...liveBranches.map((b) => ({ value: b.id, label: b.name }))]}
                onValueChange={setBranchFilter}
              />
            )}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label={L.membersActive} value={`${working.length} ${L.membersPeople}`} />
          <Kpi label={L.membersReceipts} value={String(sum((a) => receiptCount(a)))} />
          <Kpi label={L.membersBought} value={formatVnd(sum((a) => a.receipts.purchase.amount))} />
          <Kpi label={L.membersPayments} value={String(sum((a) => a.payments.count))} />
        </div>
        {activity.error && <p className="text-sm text-alert">{L.memberActivityFailed}</p>}

        {members.loading && !members.data ? (
          <Skeleton rows={3} label={L.loading} />
        ) : members.error ? (
          <ErrorState
            title={L.errorTitle}
            description={members.error}
            actions={<Button onClick={members.reload}>{L.retry}</Button>}
          />
        ) : (members.data ?? []).length <= 1 ? (
          <EmptyState
            title={L.membersEmpty}
            description={L.memberAddHint}
            icon="👥"
            action={
              <Button tone="primary" onClick={() => setAdding(true)}>
                {L.memberAdd}
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((m) => {
              const editable = m.role !== 'owner' && !m.isMe && m.status !== 'removed';
              return (
                <li key={m.id} className={`card flex flex-col gap-3 p-4 ${m.status === 'removed' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">
                        {m.name ?? '—'} {m.isMe && <span className="font-normal text-ink-3">{L.memberMe}</span>}
                      </p>
                      <p className="num text-sm text-ink-2">
                        {m.phone ? formatPhoneVn(m.phone) : '—'}
                        {m.branch && ` · ${m.branch.name}`}
                      </p>
                    </div>
                    <Badge
                      label={m.status === 'removed' ? L.memberRemovedTag : ROLE_LABEL[m.role]}
                      tone={m.role === 'owner' ? 'in' : 'neutral'}
                    />
                  </div>
                  <ActivityLine activity={byId.get(m.id)} />
                  {editable && (
                    <div className="flex flex-wrap items-end gap-2 border-t border-rule pt-3">
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

      <Dialog open={adding} title={L.memberAdd} description={L.memberAddHint} onClose={() => setAdding(false)}>
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
            maxLength={MAX_PASSWORD_LENGTH}
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
          <Button block onClick={() => setAdding(false)}>
            {L.cancel}
          </Button>
        </form>
      </Dialog>

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
