import type { ReactNode } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { AuthPage } from './AuthPage';
import { BootstrapPage } from './BootstrapPage';

/**
 * Cổng vào app.
 *
 * - Chưa có tài khoản: hiển thị AuthPage.
 * - Đã đăng ký nhưng chưa thiết lập tổ chức/vai trò (needsBootstrap): hiển thị BootstrapPage.
 * - Đã có tổ chức: vào ứng dụng chính.
 */
export function RequireAccount({ children }: { readonly children: ReactNode }) {
  const { user, needsBootstrap, status, accountState, accountError, refreshMe, signOut } = useStore();

  if (status.loading) {
    return (
      <PageContainer>
        <Skeleton rows={4} label={L.loading} />
      </PageContainer>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (accountState === 'loading') {
    return (
      <PageContainer>
        <Skeleton rows={4} label={L.loading} />
      </PageContainer>
    );
  }

  if (needsBootstrap) {
    return <BootstrapPage />;
  }

  if (accountState === 'error') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4 py-8">
        <div className="card w-full p-5 text-center">
          <h1 className="text-lg font-bold text-ink">{L.accountSetupUnavailable}</h1>
          <p role="alert" className="mt-2 text-sm text-ink-2">
            {accountError || L.accountSetupRetryHint}
          </p>
          <Button tone="primary" size="lg" block className="mt-5" onClick={() => void refreshMe()}>
            {L.accountSetupRetry}
          </Button>
          <button
            type="button"
            className="mt-3 min-h-11 text-sm font-medium text-ink-3 hover:text-ink"
            onClick={() => void signOut()}
          >
            {L.bootstrapSignOut}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
