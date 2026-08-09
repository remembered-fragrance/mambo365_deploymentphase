import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToastProvider } from '@/components/ui/Toast';
import { StoreProvider } from '@/data/store';
import { L } from '@/i18n/labels';
import { AppLayout } from '@/features/shared/AppLayout';
import { ROUTES } from '@/features/shared/navItems';
import { NotFoundPage } from '@/features/NotFoundPage';

// Tách bundle theo route: mở app chỉ tải màn Tổng quan, không tải cả app.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ReceiptsPage = lazy(() =>
  import('@/features/receipts/ReceiptsPage').then((m) => ({ default: m.ReceiptsPage })),
);
const CreateReceiptPage = lazy(() =>
  import('@/features/receipt/CreateReceiptPage').then((m) => ({ default: m.CreateReceiptPage })),
);
const ReceiptDetailPage = lazy(() =>
  import('@/features/receiptDetail/ReceiptDetailPage').then((m) => ({
    default: m.ReceiptDetailPage,
  })),
);

export function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppLayout>
              <Suspense
                fallback={
                  <PageContainer>
                    <Skeleton rows={4} label={L.loading} />
                  </PageContainer>
                }
              >
                <Routes>
                  <Route path={ROUTES.dashboard} element={<DashboardPage />} />
                  <Route path={ROUTES.receipts} element={<ReceiptsPage />} />
                  <Route path={ROUTES.create} element={<CreateReceiptPage />} />
                  <Route path="/phieu/:id" element={<ReceiptDetailPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </BrowserRouter>
        </ToastProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
