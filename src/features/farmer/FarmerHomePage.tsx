import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLinkedBalance } from '@/data/hooks/useLinked';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { ClaimCodeCard } from './ClaimCodeCard';
import { TraderBalanceCard } from './TraderBalanceCard';

/**
 * Trang chủ vỏ Nông dân (`farmer`): không có sổ offline, không có gói.
 * Nhập mã kết nối vựa đưa → thấy từng vựa còn nợ bao nhiêu → bấm vào xem phiếu.
 */
export function FarmerHomePage() {
  const { user, currentOrg } = useStore();
  const balance = useLinkedBalance();
  const name = user?.name || currentOrg?.organization.name || '';

  return (
    <PageContainer width="content">
      <PageHeader title={`${L.farmerHello}${name ? ` ${name}` : ''}`} subtitle={L.farmerIntro} />

      <div className="grid gap-4">
        <ClaimCodeCard onClaimed={balance.reload} />

        <section aria-labelledby="farmer-traders">
          <h2 id="farmer-traders" className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3">
            {L.farmerTradersTitle}
          </h2>
          {balance.loading && !balance.data ? (
            <Skeleton rows={2} label={L.loading} />
          ) : balance.error ? (
            <ErrorState
              title={L.errorTitle}
              description={balance.error}
              actions={<Button onClick={balance.reload}>{L.retry}</Button>}
            />
          ) : balance.data && balance.data.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {balance.data.map((item) => (
                <li key={item.organization.id}>
                  <TraderBalanceCard item={item} to={ROUTES.linkedTrader(item.organization.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={L.farmerNoTraders} description={L.farmerNoTradersHint} icon="🤝" />
          )}
        </section>

        <Card title={L.farmerSoonTitle}>
          <p className="text-sm text-ink-2">{L.farmerSoonOrders}</p>
        </Card>

        <Link to={ROUTES.profile} className="card flex min-h-16 items-center p-4 text-base font-bold text-brand">
          {L.farmerAccount}
        </Link>
      </div>
    </PageContainer>
  );
}
