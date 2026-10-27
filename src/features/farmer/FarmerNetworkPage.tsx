import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { formatVnd, formatWeight } from '@mambo/core/format';
import { useFarmerConnections } from '@/data/hooks/useFarmerConnections';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { canRevokeFarmerLink } from './farmerAccessModel';

export function FarmerNetworkPage() {
  const { orgType, permissions } = useStore();
  const network = useFarmerConnections();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);
  const balance = network.balances.find((item) => item.organization.id === network.selectedOrgId);
  const receiptOptions = useMemo(() => network.balances.map((item) => ({ value: item.organization.id, label: item.organization.name })), [network.balances]);

  if (orgType !== 'farmer') return <PageContainer><DashboardHeader /><EmptyState title={L.farmerOnlyPage} /></PageContainer>;
  if (!network.enabled && network.availability === 'feature-off') return <PageContainer><DashboardHeader /><EmptyState title={L.farmerLinksFeatureOff} description={L.farmerLinksFeatureOffHint} /></PageContainer>;
  if (!network.enabled) return <PageContainer><DashboardHeader /><EmptyState title={L.farmerLinksPermissionOff} /></PageContainer>;

  const submitCode = async () => {
    const result = await network.claim(code);
    setCode('');
    if (result.counterpart?.id) network.setSelectedOrgId(result.counterpart.id);
    toast({ message: L.farmerConnectionClaimed });
  };

  return (
    <PageContainer width="wide">
      <DashboardHeader />
      <PageHeader title={L.farmerNetworkTitle} />
      {network.error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm"><span>{network.error}</span><Button onClick={() => void network.retry()}>{L.dashboardRetry}</Button></div>}
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card p-5 lg:col-span-5">
          <h2 className="text-base font-bold text-ink">{L.farmerClaimCodeTitle}</h2>
          <p className="mt-1 text-sm text-ink-3">{L.farmerClaimCodeHint}</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><Input label={L.farmerConnectionCode} value={code} autoCapitalize="characters" maxLength={12} placeholder={L.farmerConnectionCodePlaceholder} onChange={(event) => setCode(event.target.value)} /></div>
    <Button tone="primary" disabled={network.mutating || !code.trim()} onClick={() => void submitCode().catch(() => undefined)}>{network.mutating ? L.loading : L.farmerClaimCode}</Button>
          </div>
        </section>
        <div className="lg:col-span-7"><Card title={L.farmerConnectedOrganizations}>
          {network.loading && network.links.length === 0 ? <p className="text-sm text-ink-3">{L.loading}</p> : network.links.length === 0 && network.error ? <p className="text-sm text-ink-3">{L.farmerLinkedLoadError}</p> : network.links.length === 0 ? <EmptyState title={L.farmerNoConnections} description={L.farmerClaimFirstLinkHint} icon="🔗" /> : (
            <ul className="divide-y divide-rule">{network.links.map((link) => {
              const name = link.counterpart?.name ?? link.partner.name;
              return <li key={link.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-bold text-ink">{name}</p><p className="text-xs text-ink-3">{linkStatus(link.status)} · {new Date(link.createdAt).toLocaleDateString('vi-VN')}</p></div>{link.status !== 'revoked' && canRevokeFarmerLink(link.side, permissions) && <Button tone="danger" disabled={network.mutating} onClick={() => setRevokeTarget({ id: link.id, name })}>{L.farmerDisconnect}</Button>}</li>;
            })}</ul>
          )}
        </Card></div>

        <div className="lg:col-span-12"><Card title={L.farmerLinkedReceiptsTitle} subtitle={L.farmerLinkedReceiptsHint}>
          {receiptOptions.length === 0 ? <p className="text-sm text-ink-3">{network.error ? L.farmerLinkedLoadError : L.farmerNoReceipts}</p> : <div className="mb-3 max-w-md"><Select label={L.farmerChooseOrganization} value={network.selectedOrgId} options={receiptOptions} onValueChange={network.setSelectedOrgId} /></div>}
          {balance && <div className="mb-3 flex flex-wrap gap-4 rounded-xl bg-surface-2 p-3 text-sm"><span>{L.farmerTheyOwe}: <b className="num">{formatVnd(balance.theyOwe)}</b></span><span>{L.farmerYouOwe}: <b className="num">{formatVnd(balance.youOwe)}</b></span><span>{L.receiptsCount}: <b className="num">{balance.receiptCount}</b></span></div>}
          {network.loading && network.receipts.length === 0 ? <p className="text-sm text-ink-3">{L.loading}</p> : network.receipts.length === 0 && network.error ? <p className="text-sm text-ink-3">{L.farmerLinkedLoadError}</p> : network.receipts.length === 0 ? <p className="text-sm text-ink-3">{L.farmerNoReceipts}</p> : (
            <ul className="divide-y divide-rule">{network.receipts.map((receipt) => <li key={receipt.id} className="py-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-ink">{receipt.kind === 'purchase' ? L.farmerReceiptSale : L.farmerReceiptPurchase} · {receipt.partyName}</p><p className="mt-1 text-xs text-ink-3">{new Date(receipt.date).toLocaleString('vi-VN')} · {formatWeight(receipt.netWeight)}</p></div><div className="text-right"><p className="num font-bold text-ink">{formatVnd(receipt.total)}</p><p className="num text-xs text-ink-3">{L.farmerPaid}: {formatVnd(receipt.paid)} · {L.farmerRemainingDebt}: {formatVnd(receipt.debt)}</p></div></div><ul className="mt-2 flex flex-wrap gap-2">{receipt.lines.map((line, index) => <li key={`${line.productName}-${index}`} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-ink-2">{line.productName}: {line.netWeight.toLocaleString('vi-VN')} {line.unit} × {line.pricePerUnit.toLocaleString('vi-VN')}</li>)}</ul>{receipt.payments.length > 0 && <p className="mt-2 text-xs text-ink-3">{L.farmerPaymentHistory}: {receipt.payments.map((payment) => `${new Date(payment.date).toLocaleDateString('vi-VN')} ${formatVnd(payment.amount)}`).join(' · ')}</p>}</li>)}</ul>
          )}
          {network.cursor && <div className="mt-3 flex justify-center"><Button disabled={network.loadingMore} onClick={network.loadMore}>{network.loadingMore ? L.loading : L.loadMore}</Button></div>}
        </Card></div>
      </div>
      <ConfirmDialog open={Boolean(revokeTarget)} title={L.farmerDisconnect} consequence={L.farmerDisconnectConsequence.replace('{name}', revokeTarget?.name ?? '')} confirmLabel={L.farmerDisconnect} onCancel={() => setRevokeTarget(null)} onConfirm={() => { const target = revokeTarget; setRevokeTarget(null); if (target) void network.revoke(target.id).then(() => toast({ message: L.farmerConnectionRevoked })).catch(() => undefined); }} />
    </PageContainer>
  );
}

function linkStatus(status: 'active' | 'pending' | 'revoked') {
  return ({ active: L.farmerLinkActive, pending: L.farmerLinkPending, revoked: L.farmerLinkRevoked })[status];
}
