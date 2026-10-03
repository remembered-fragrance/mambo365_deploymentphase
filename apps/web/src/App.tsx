import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToastProvider } from '@/components/ui/Toast';
import { StoreProvider } from '@/data/store';
import { L } from '@/i18n/labels';
import { RequireAccount } from '@/features/auth/RequireAccount';
import { AppLayout } from '@/features/shared/AppLayout';
import { ROUTES } from '@/features/shared/navItems';
import { NotFoundPage } from '@/features/NotFoundPage';
import { saveBookToFile } from '@/features/shared/bookFile';

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
const DebtsPage = lazy(() =>
  import('@/features/debts/DebtsPage').then((m) => ({ default: m.DebtsPage })),
);
const InventoryPage = lazy(() =>
  import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);
const PartnerListPage = lazy(() =>
  import('@/features/partners/PartnerListPage').then((m) => ({ default: m.PartnerListPage })),
);
const ProductsPage = lazy(() =>
  import('@/features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const PricingPage = lazy(() =>
  import('@/features/pricing/PricingPage').then((m) => ({ default: m.PricingPage })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const UtilitiesPage = lazy(() =>
  import('@/features/utilities/UtilitiesPage').then((m) => ({ default: m.UtilitiesPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const MorePage = lazy(() =>
  import('@/features/more/MorePage').then((m) => ({ default: m.MorePage })),
);
const PlansPage = lazy(() =>
  import('@/features/billing/PlansPage').then((m) => ({ default: m.PlansPage })),
);
const ImportDataPage = lazy(() =>
  import('@/features/importData/ImportDataPage').then((m) => ({ default: m.ImportDataPage })),
);

export function App() {
  return (
    // Lối thoát khi app vỡ: cứu sổ ra file trước đã. `saveBookToFile` đọc bản
    // sổ mới nhất qua một hàm đăng ký, vì ở đây còn ở NGOÀI <StoreProvider>
    // nên không gọi hook được.
    <ErrorBoundary onExportFile={saveBookToFile}>
      <StoreProvider>
        <ToastProvider>
          <BrowserRouter>
            <RequireAccount>
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
                    <Route path={ROUTES.debts} element={<DebtsPage />} />
                    <Route path={ROUTES.inventory} element={<InventoryPage />} />
                    <Route path={ROUTES.suppliers} element={<PartnerListPage role="supplier" />} />
                    <Route path={ROUTES.buyers} element={<PartnerListPage role="buyer" />} />
                    <Route path={ROUTES.products} element={<ProductsPage />} />
                    <Route path={ROUTES.pricing} element={<PricingPage />} />
                    <Route path={ROUTES.reports} element={<ReportsPage />} />
                    <Route path={ROUTES.utilities} element={<UtilitiesPage />} />
                    <Route path={ROUTES.profile} element={<ProfilePage />} />
                    <Route path={ROUTES.plans} element={<PlansPage />} />
                    <Route path={ROUTES.importData} element={<ImportDataPage />} />
                    <Route path={ROUTES.more} element={<MorePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </AppLayout>
            </RequireAccount>
          </BrowserRouter>
        </ToastProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}
