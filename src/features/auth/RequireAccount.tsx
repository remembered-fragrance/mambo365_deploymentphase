import type { ReactNode } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { SetupOrgPage } from '../onboarding/SetupOrgPage';
import { AuthPage } from './AuthPage';

/**
 * Cổng vào app.
 *
 * Chưa cấu hình máy chủ thì `user` là "tài khoản của máy này" nên cổng này
 * không chặn gì cả — app vẫn dùng được offline hoàn toàn, đúng như giai đoạn D
 * đã quyết. Chỉ khi có máy chủ mà chưa đăng nhập mới hiện màn đăng nhập.
 *
 * Đã đăng nhập mà chưa thuộc tổ chức nào (`/v1/me` trả `memberships: []`) ⇒ bước
 * "Bạn là ai?" trước khi vào app — vỏ và quyền đều suy từ tổ chức đó.
 */
export function RequireAccount({ children }: { readonly children: ReactNode }) {
  const { user, status, needsBootstrap } = useStore();

  if (status.loading) {
    return (
      <PageContainer>
        <Skeleton rows={4} label={L.loading} />
      </PageContainer>
    );
  }

  if (!user) return <AuthPage />;
  if (needsBootstrap) return <SetupOrgPage />;
  return <>{children}</>;
}
