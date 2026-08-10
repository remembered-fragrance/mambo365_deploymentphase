import type { ReactNode } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { AuthPage } from './AuthPage';

/**
 * Cổng vào app.
 *
 * Chưa cấu hình máy chủ thì `user` là "tài khoản của máy này" nên cổng này
 * không chặn gì cả — app vẫn dùng được offline hoàn toàn, đúng như giai đoạn D
 * đã quyết. Chỉ khi có máy chủ mà chưa đăng nhập mới hiện màn đăng nhập.
 */
export function RequireAccount({ children }: { readonly children: ReactNode }) {
  const { user, status } = useStore();

  if (status.loading) {
    return (
      <PageContainer>
        <Skeleton rows={4} label={L.loading} />
      </PageContainer>
    );
  }

  return user ? <>{children}</> : <AuthPage />;
}
