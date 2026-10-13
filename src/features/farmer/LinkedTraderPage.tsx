import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  linkErrorMessage,
  revokeLink,
  useLinkedBalance,
  useLinkedReceipts,
  useLinks,
} from '@/data/hooks/useLinked';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { LinkedReceiptCard } from './LinkedReceiptCard';
import { TraderBalanceCard } from './TraderBalanceCard';

/** Một vựa (hoặc doanh nghiệp) đã kết nối: còn nợ bao nhiêu, từng phiếu, huỷ kết nối. */
export function LinkedTraderPage() {
  const { orgId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentOrgId } = useStore();
  const balance = useLinkedBalance();
  const links = useLinks();
  const pages = useLinkedReceipts(orgId);
  const [confirming, setConfirming] = useState(false);

  const item = balance.data?.find((b) => b.organization.id === orgId);
  const link = links.data?.find((l) => l.side === 'linked' && l.status === 'active' && l.counterpart?.id === orgId);

  const revoke = async () => {
    setConfirming(false);
    if (!link) return;
    try {
      await revokeLink(link.id);
      toast({ message: L.linkRevoked });
      navigate(ROUTES.dashboard);
    } catch (err) {
      toast({ message: linkErrorMessage(err), tone: 'alert' });
    }
  };

  const back = (
    <Link to={ROUTES.dashboard} className="flex min-h-11 items-center font-semibold text-brand underline">
      {L.farmerBackHome}
    </Link>
  );

  if (!currentOrgId || (balance.data && !item)) {
    return (
      <PageContainer width="content">
        <EmptyState title={L.farmerTraderMissing} icon="🤝" action={back} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="content">
      <PageHeader title={item?.organization.name ?? ''} actions={back} />

      <div className="grid gap-4">
        {item ? <TraderBalanceCard item={item} /> : <Skeleton rows={1} label={L.loading} />}

        <section aria-labelledby="linked-receipts">
          <h2 id="linked-receipts" className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3">
            {L.farmerReceiptsTitle}
          </h2>
          {pages.receipts.length > 0 && (
            <ul className="flex flex-col gap-2">
              {pages.receipts.map((r) => (
                <li key={r.id}>
                  <LinkedReceiptCard receipt={r} />
                </li>
              ))}
            </ul>
          )}
          {pages.loading && <Skeleton rows={2} label={L.loading} />}
          {pages.error && (
            <ErrorState
              title={L.errorTitle}
              description={pages.error}
              actions={<Button onClick={pages.loadMore}>{L.retry}</Button>}
            />
          )}
          {!pages.loading && !pages.error && pages.receipts.length === 0 && (
            <EmptyState title={L.farmerNoReceipts} icon="📄" />
          )}
          {!pages.loading && !pages.error && pages.hasMore && pages.receipts.length > 0 && (
            <Button block className="mt-2" onClick={pages.loadMore}>
              {L.loadMore}
            </Button>
          )}
        </section>

        {link && (
          <Button tone="danger" block onClick={() => setConfirming(true)}>
            {L.linkRevoke}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title={`${L.linkRevoke} — ${item?.organization.name ?? ''}`}
        consequence={L.linkRevokeConsequence}
        confirmLabel={L.linkRevoke}
        onConfirm={() => void revoke()}
        onCancel={() => setConfirming(false)}
      />
    </PageContainer>
  );
}
