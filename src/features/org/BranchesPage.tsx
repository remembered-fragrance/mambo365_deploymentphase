import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { createBranch, orgErrorMessage, updateBranch, useBranches } from '@/data/hooks/useOrg';
import { L } from '@/i18n/labels';

/**
 * Chi nhánh của doanh nghiệp. Số chi nhánh đang dùng ≤ giới hạn của gói (vượt → BRANCH_LIMIT).
 * Chỉ lưu trữ, không xoá — phiếu cũ vẫn trỏ tới; còn người gắn thì không lưu trữ được.
 */
export function BranchesPage() {
  const branches = useBranches();
  const toast = useToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await createBranch({ name: name.trim(), address: address.trim() || null });
      toast({ message: L.branchAdded });
      setName('');
      setAddress('');
      branches.reload();
    } catch (err) {
      setError(orgErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, archived: boolean) => {
    try {
      await updateBranch(id, { archived });
    } catch (err) {
      toast({ message: orgErrorMessage(err), tone: 'alert' });
    }
    branches.reload();
  };

  const list = branches.data;

  return (
    <PageContainer width="content">
      <PageHeader
        title={L.navBranches}
        subtitle={list ? `${L.branchUsed}: ${list.used} / ${list.limit ?? L.branchUnlimited}` : undefined}
      />
      <div className="grid gap-4">
        <Card title={L.branchAdd}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Input label={L.branchName} value={name} required maxLength={120} onChange={(e) => setName(e.target.value)} />
            <Input label={L.branchAddress} value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} />
            {error && <p className="text-sm text-alert">{error}</p>}
            <Button type="submit" tone="primary" block disabled={busy}>
              {L.branchAdd}
            </Button>
          </form>
        </Card>

        {branches.loading && !list ? (
          <Skeleton rows={3} label={L.loading} />
        ) : branches.error ? (
          <ErrorState
            title={L.errorTitle}
            description={branches.error}
            actions={<Button onClick={branches.reload}>{L.retry}</Button>}
          />
        ) : !list || list.branches.length === 0 ? (
          <EmptyState title={L.branchesEmpty} icon="🏬" />
        ) : (
          <ul className="flex flex-col gap-2">
            {list.branches.map((b) => (
              <li key={b.id} className={`card flex items-center justify-between gap-3 p-4 ${b.archived ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{b.name}</p>
                  {b.address && <p className="truncate text-sm text-ink-2">{b.address}</p>}
                  <p className="num text-sm text-ink-3">
                    {b.memberCount} {L.branchMembers}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {b.archived && <Badge label={L.branchArchived} />}
                  <Button onClick={() => void toggle(b.id, !b.archived)}>
                    {b.archived ? L.branchUnarchive : L.branchArchive}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
