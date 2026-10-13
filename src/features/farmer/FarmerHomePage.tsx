import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

/**
 * Trang chủ vỏ Nông dân (`farmer`): không có sổ offline, không có gói.
 *
 * Đơn bán, tiền vựa còn nợ, nhập mã kết nối cần SDK ≥ v0.6.0 (`api.orders`,
 * `api.linked`, `api.links.claim`); app đang dùng v0.4.0 nên tạm hiện là "Sắp có".
 */
export function FarmerHomePage() {
  const { user, currentOrg } = useStore();
  const name = user?.name || currentOrg?.organization.name || '';

  return (
    <PageContainer width="content">
      <PageHeader title={`${L.farmerHello}${name ? ` ${name}` : ''}`} />

      <div className="grid gap-4">
        <Card>
          <p className="text-base text-ink-2">{L.farmerIntro}</p>
          {currentOrg && <p className="mt-2 text-lg font-bold text-ink">{currentOrg.organization.name}</p>}
        </Card>

        <Card>
          <h2 className="text-base font-bold text-ink">{L.farmerSoonTitle}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>{L.farmerSoonOrders}</li>
            <li>{L.farmerSoonDebts}</li>
            <li>{L.farmerSoonLinks}</li>
          </ul>
        </Card>

        <Link to={ROUTES.profile} className="card flex min-h-16 items-center p-4 text-base font-bold text-brand">
          {L.farmerAccount}
        </Link>
      </div>
    </PageContainer>
  );
}
