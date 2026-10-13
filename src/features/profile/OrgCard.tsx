import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { leaveOrg, orgErrorMessage, renameOrg } from '@/data/hooks/useOrg';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ORG_TYPE_TEXT, roleText } from '../shared/roleText';

/**
 * Tổ chức đang làm việc: loại (vỏ giao diện), vai trò, chi nhánh. Thuộc nhiều tổ
 * chức thì đổi ở đây (FRONTEND.md §5.3). Chưa có tổ chức (sổ của máy) thì ẩn.
 * Chủ đổi được tên; người khác tự rời được (BE 0.12.0) — máy chủ kiểm vai trò.
 */
export function OrgCard() {
  const { currentOrg, memberships, selectOrg, refreshMe, status } = useStore();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  if (!currentOrg) return null;

  const { organization, role, branch } = currentOrg;
  const owner = role === 'owner';

  const run = async (work: () => Promise<void>, done: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await work();
      toast({ message: done });
      setName(null);
      // Tên mới / tổ chức đã rời lấy lại từ /v1/me — không còn tổ chức nào thì app tự về "Bác là ai?".
      await refreshMe();
    } catch (err) {
      setError(orgErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={L.orgCardTitle}>
      {owner && name !== null ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => renameOrg(name.trim()), L.orgRenamed);
          }}
        >
          <Input label={L.orgName} value={name} required maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" tone="primary" disabled={busy || !name.trim()}>
              {L.save}
            </Button>
            <Button onClick={() => setName(null)}>{L.cancel}</Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-bold text-ink">{organization.name}</p>
          {owner && <Button onClick={() => setName(organization.name)}>{L.orgRename}</Button>}
        </div>
      )}
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

      {!owner && (
        <div className="mt-3 flex flex-col gap-2">
          {/* Rời là dọn sổ của tổ chức khỏi máy: op chưa gửi mà dọn là mất phiếu. */}
          {status.pendingCount > 0 && (
            <p className="text-sm text-alert">
              {L.orgLeavePending} <span className="num font-bold">{status.pendingCount}</span>
            </p>
          )}
          <Button tone="danger" disabled={busy || status.pendingCount > 0} onClick={() => setLeaving(true)}>
            {L.orgLeave}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}

      <ConfirmDialog
        open={leaving}
        title={`${L.orgLeave} — ${organization.name}`}
        consequence={L.orgLeaveConsequence}
        confirmLabel={L.orgLeave}
        onConfirm={() => {
          setLeaving(false);
          void run(() => leaveOrg(organization.id), L.orgLeft);
        }}
        onCancel={() => setLeaving(false)}
      />
    </Card>
  );
}
