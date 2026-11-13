import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChevronRightIcon } from '@/components/ui/icons';
import { L } from '@/i18n/labels';
import { moreGroups } from '../shared/navItems';
import { useAccess } from '../shared/useAccess';

/**
 * Ô "Thêm" của thanh dưới.
 *
 * Ở máy tính mọi mục này nằm sẵn trong sidebar; ở điện thoại thanh dưới chỉ có
 * 5 chỗ và bốn thứ hằng ngày đã chiếm hết. Trang này giữ đúng lời hứa "mọi
 * chức năng đến được trong ≤2 chạm từ Tổng quan". Chia nhóm như sidebar: mười
 * mấy mục một danh sách phẳng thì phải đọc hết mới tìm ra.
 */
export function MorePage() {
  const access = useAccess();
  return (
    <PageContainer width="content">
      <PageHeader title={L.navMore} />

      <div className="grid gap-5 sm:grid-cols-2">
        {moreGroups(access).map((group) => (
          <section key={group.id} aria-labelledby={`nhom-${group.id}`}>
            <h2 id={`nhom-${group.id}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
              {group.label}
            </h2>
            <ul className="card divide-y divide-rule overflow-hidden">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-paper">
                    <item.Icon className="h-6 w-6 shrink-0 text-brand" />
                    <span className="flex-1 text-base font-bold text-ink">{item.label}</span>
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}
