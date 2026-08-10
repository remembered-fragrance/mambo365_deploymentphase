import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChevronRightIcon } from '@/components/ui/icons';
import { L } from '@/i18n/labels';
import { secondaryItems } from '../shared/navItems';

/**
 * Ô "Thêm" của thanh dưới.
 *
 * Ở máy tính mọi mục này nằm sẵn trong sidebar; ở điện thoại thanh dưới chỉ có
 * 5 chỗ và bốn thứ hằng ngày đã chiếm hết. Trang này giữ đúng lời hứa "mọi
 * chức năng đến được trong ≤2 chạm từ Tổng quan".
 */
export function MorePage() {
  return (
    <PageContainer width="content">
      <PageHeader title={L.navMore} />

      <ul className="grid gap-2 sm:grid-cols-2">
        {secondaryItems().map((item) => (
          <li key={item.id}>
            <Link to={item.to} className="card flex min-h-16 items-center gap-3 p-4">
              <item.Icon className="h-6 w-6 shrink-0 text-brand" />
              <span className="flex-1 text-base font-bold text-ink">{item.label}</span>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
