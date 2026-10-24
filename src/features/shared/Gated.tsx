import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { L } from '@/i18n/labels';
import { allows } from './access';
import { ROUTE_GATES, ROUTES } from './navItems';
import { useAccess } from './useAccess';

/**
 * Chặn màn theo `ROUTE_GATES[route]` khi người dùng gõ thẳng đường dẫn hoặc bấm
 * link cũ — điều hướng đã ẩn mục, đây là lớp thứ hai. Server vẫn kiểm lần cuối.
 */
export function Gated({ route, children }: { readonly route: string; readonly children: ReactNode }) {
  const access = useAccess();
  if (allows(access, ROUTE_GATES[route])) return <>{children}</>;

  return (
    <PageContainer width="content">
      <EmptyState
        title={L.noAccessTitle}
        description={L.noAccessHint}
        icon="🔒"
        action={
          <Link to={ROUTES.dashboard} className="flex min-h-11 items-center font-semibold text-brand underline">
            {L.noAccessHome}
          </Link>
        }
      />
    </PageContainer>
  );
}
