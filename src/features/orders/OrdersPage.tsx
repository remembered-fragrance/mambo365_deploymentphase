import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOrders } from '@/data/hooks/useOrders';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { useAccess } from '../shared/useAccess';
import { OrderCard } from './OrderCard';

/** Đơn của tổ chức đang làm việc, cả đơn mình bán lẫn mình mua, mới tạo trước. */
export function OrdersPage() {
  const { can, orgType } = useAccess();
  const orders = useOrders();
  const navigate = useNavigate();

  const create = can('order:create') && (
    <Button tone="primary" onClick={() => navigate(ROUTES.orderCreate)}>
      {orgType === 'farmer' ? L.orderCreateSell : L.orderCreate}
    </Button>
  );

  return (
    <PageContainer width="content">
      <PageHeader title={L.navOrders} actions={create} />
      {orders.loading && !orders.data ? (
        <Skeleton rows={3} label={L.loading} />
      ) : orders.error ? (
        <ErrorState
          title={L.errorTitle}
          description={orders.error}
          actions={<Button onClick={orders.reload}>{L.retry}</Button>}
        />
      ) : orders.data && orders.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {orders.data.map((o) => (
            <li key={o.id}>
              <OrderCard order={o} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={L.ordersEmpty} description={L.ordersEmptyHint} icon="📦" />
      )}
    </PageContainer>
  );
}
