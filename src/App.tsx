import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToastProvider } from '@/components/ui/Toast';
import { StoreProvider } from '@/data/store';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { RequireAccount } from '@/features/auth/RequireAccount';
import { AppLayout } from '@/features/shared/AppLayout';
import { Gated } from '@/features/shared/Gated';
import { ROUTES } from '@/features/shared/navItems';
import { NotFoundPage } from '@/features/NotFoundPage';
import { saveBookToFile } from '@/features/shared/bookFile';
import { LeftOrgsDialog } from '@/features/shared/LeftOrgsDialog';
import { ReloadRequiredOverlay } from '@/features/shared/ReloadRequiredOverlay';
import { resolveDeveloperRolePreviewPath } from '@/features/dev/rolePreviewRoute';

// Tách bundle theo route: mở app chỉ tải màn Tổng quan, không tải cả app.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const FarmerHomePage = lazy(() =>
  import('@/features/farmer/FarmerHomePage').then((m) => ({ default: m.FarmerHomePage })),
);
const LinkedTraderPage = lazy(() =>
  import('@/features/farmer/LinkedTraderPage').then((m) => ({ default: m.LinkedTraderPage })),
);
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderCreatePage = lazy(() =>
  import('@/features/orders/OrderCreatePage').then((m) => ({ default: m.OrderCreatePage })),
);
const OrderDetailPage = lazy(() =>
  import('@/features/orders/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const MembersPage = lazy(() => import('@/features/org/MembersPage').then((m) => ({ default: m.MembersPage })));
const AuditPage = lazy(() => import('@/features/org/AuditPage').then((m) => ({ default: m.AuditPage })));
const BranchesPage = lazy(() => import('@/features/org/BranchesPage').then((m) => ({ default: m.BranchesPage })));
const OrgReportPage = lazy(() => import('@/features/org/OrgReportPage').then((m) => ({ default: m.OrgReportPage })));
const ConnectPage = lazy(() => import('@/features/farmer/ConnectPage').then((m) => ({ default: m.ConnectPage })));
// Leaflet (~150KB) chỉ tải khi mở bản đồ.
const MapPage = lazy(() => import('@/features/map/MapPage').then((m) => ({ default: m.MapPage })));
const MyPlacesPage = lazy(() => import('@/features/map/MyPlacesPage').then((m) => ({ default: m.MyPlacesPage })));
const FeedbackPage = lazy(() => import('@/features/feedback/FeedbackPage').then((m) => ({ default: m.FeedbackPage })));
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
const AnalyticsPage = lazy(() =>
  import('@/features/reports/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const ContractsPage = lazy(() =>
  import('@/features/contracts/ContractsPage').then((m) => ({ default: m.ContractsPage })),
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
// Trang mở từ link trong thư (BE 0.16.0) — công khai, như trang pháp lý.
const ResetPasswordPage = lazy(() =>
  import('@/features/recovery/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const ConfirmEmailPage = lazy(() =>
  import('@/features/recovery/ConfirmEmailPage').then((m) => ({ default: m.ConfirmEmailPage })),
);
const LegalPage = lazy(() =>
  import('@/features/legal/LegalPage').then((m) => ({ default: m.LegalPage })),
);
const ImportDataPage = lazy(() =>
  import('@/features/importData/ImportDataPage').then((m) => ({ default: m.ImportDataPage })),
);
const FarmerOrdersPage = lazy(() => import('@/features/farmer/FarmerOrdersPage').then((m) => ({ default: m.FarmerOrdersPage })));
const FarmerNetworkPage = lazy(() => import('@/features/farmer/FarmerNetworkPage').then((m) => ({ default: m.FarmerNetworkPage })));
const FarmerWeighDebtPage = lazy(() => import('@/features/farmer/FarmerWeighDebtPage').then((m) => ({ default: m.FarmerWeighDebtPage })));
const DeveloperRolePreviewPage = import.meta.env.DEV
  ? lazy(() => import('@/features/dev/DeveloperRolePreviewPage').then((m) => ({ default: m.DeveloperRolePreviewPage })))
  : NotFoundPage;

/** Trang chủ theo vỏ: nông dân không có sổ ⇒ trang riêng; vựa, doanh nghiệp ⇒ Tổng quan của sổ. */
function HomePage() {
  const { orgType } = useStore();
  return orgType === 'farmer' ? <FarmerHomePage /> : <DashboardPage />;
}

export function App() {
  return (
    // Lối thoát khi app vỡ: cứu sổ ra file trước đã. `saveBookToFile` đọc bản
    // sổ mới nhất qua một hàm đăng ký, vì ở đây còn ở NGOÀI <StoreProvider>
    // nên không gọi hook được.
    <ErrorBoundary onExportFile={saveBookToFile}>
      <StoreProvider>
        <ToastProvider>
          {/* Ngoài cổng đăng nhập: bị gỡ khỏi tổ chức duy nhất thì người dùng đang ở màn tạo tổ chức (B8). */}
          <ReloadRequiredOverlay />
          <LeftOrgsDialog />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();
  const destination = resolveDeveloperRolePreviewPath(pathname, import.meta.env.DEV);
  if (destination === 'preview') {
    return <Suspense fallback={<PageContainer><Skeleton rows={4} label={L.loading} /></PageContainer>}><DeveloperRolePreviewPage /></Suspense>;
  }
  if (destination === 'not-found') return <NotFoundPage />;

  return <Routes>
              {/* Pháp lý & hướng dẫn: công khai, ngoài cổng đăng nhập và ngoài khung app. */}
              <Route path={ROUTES.terms} element={<Suspense fallback={null}><LegalPage kind="terms" /></Suspense>} />
              <Route path={ROUTES.privacy} element={<Suspense fallback={null}><LegalPage kind="privacy" /></Suspense>} />
              <Route path={ROUTES.guide} element={<Suspense fallback={null}><LegalPage kind="guide" /></Suspense>} />
              {/* Link trong thư: người quên mật khẩu chưa đăng nhập được ⇒ ngoài cổng đăng nhập. */}
              <Route path={ROUTES.resetPassword} element={<Suspense fallback={null}><ResetPasswordPage /></Suspense>} />
              <Route path={ROUTES.confirmEmail} element={<Suspense fallback={null}><ConfirmEmailPage /></Suspense>} />
              <Route
                path="*"
                element={
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
                        <Route path={ROUTES.dashboard} element={<HomePage />} />
                        <Route path={ROUTES.receipts} element={<Gated route={ROUTES.receipts}><ReceiptsPage /></Gated>} />
                        <Route path={ROUTES.create} element={<Gated route={ROUTES.create}><CreateReceiptPage /></Gated>} />
                        <Route path="/phieu/:id" element={<Gated route={ROUTES.receipts}><ReceiptDetailPage /></Gated>} />
                        <Route path={ROUTES.debts} element={<Gated route={ROUTES.debts}><DebtsPage /></Gated>} />
                        <Route path={ROUTES.inventory} element={<Gated route={ROUTES.inventory}><InventoryPage /></Gated>} />
                        <Route path={ROUTES.suppliers} element={<Gated route={ROUTES.suppliers}><PartnerListPage role="supplier" /></Gated>} />
                        <Route path={ROUTES.buyers} element={<Gated route={ROUTES.buyers}><PartnerListPage role="buyer" /></Gated>} />
                        <Route path={ROUTES.products} element={<Gated route={ROUTES.products}><ProductsPage /></Gated>} />
                        <Route path={ROUTES.pricing} element={<Gated route={ROUTES.pricing}><PricingPage /></Gated>} />
                        <Route path={ROUTES.reports} element={<Gated route={ROUTES.reports}><ReportsPage /></Gated>} />
                        <Route path={ROUTES.analytics} element={<Gated route={ROUTES.analytics}><AnalyticsPage /></Gated>} />
                        <Route path={ROUTES.contracts} element={<Gated route={ROUTES.contracts}><ContractsPage /></Gated>} />
                        <Route path={ROUTES.utilities} element={<Gated route={ROUTES.utilities}><UtilitiesPage /></Gated>} />
                        <Route path={ROUTES.profile} element={<ProfilePage />} />
                        <Route path={ROUTES.plans} element={<Gated route={ROUTES.plans}><PlansPage /></Gated>} />
                        <Route path={ROUTES.importData} element={<Gated route={ROUTES.importData}><ImportDataPage /></Gated>} />
                        <Route path="/vua/:orgId" element={<Gated route={ROUTES.linked}><LinkedTraderPage /></Gated>} />
                        <Route path={ROUTES.orders} element={<Gated route={ROUTES.orders}><OrdersByOrg /></Gated>} />
                        <Route path={ROUTES.orderCreate} element={<Gated route={ROUTES.orderCreate}><OrderCreatePage /></Gated>} />
                        <Route path="/don-hang/:id" element={<Gated route={ROUTES.orders}><OrderDetailPage /></Gated>} />
                        <Route path={ROUTES.notifications} element={<Gated route={ROUTES.notifications}><NotificationsPage /></Gated>} />
                        <Route path={ROUTES.members} element={<Gated route={ROUTES.members}><MembersPage /></Gated>} />
                        <Route path={ROUTES.audit} element={<Gated route={ROUTES.audit}><AuditPage /></Gated>} />
                        <Route path={ROUTES.branches} element={<Gated route={ROUTES.branches}><BranchesPage /></Gated>} />
                        <Route path={ROUTES.orgReport} element={<Gated route={ROUTES.orgReport}><OrgReportPage /></Gated>} />
                        <Route path={ROUTES.connect} element={<Gated route={ROUTES.connect}><ConnectByOrg /></Gated>} />
                        <Route path={ROUTES.farmerWeighDebt} element={<Gated route={ROUTES.connect}><FarmerWeighDebtPage /></Gated>} />
                        <Route path={ROUTES.map} element={<Gated route={ROUTES.map}><MapPage /></Gated>} />
                        <Route path={ROUTES.myPlaces} element={<Gated route={ROUTES.myPlaces}><MyPlacesPage /></Gated>} />
                        <Route path={ROUTES.feedback} element={<Gated route={ROUTES.feedback}><FeedbackPage /></Gated>} />
                        <Route path={ROUTES.more} element={<MorePage />} />
                        {/* Màn đăng nhập hiện ở MỌI đường dẫn khi chưa đăng nhập (`RequireAccount`); vào bằng
                            link /dang-nhap thì đăng nhập xong URL vẫn là /dang-nhap — đưa về Trang chủ, không 404. */}
                        <Route path={ROUTES.auth} element={<Navigate to={ROUTES.dashboard} replace />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                </RequireAccount>
                }
              />
            </Routes>;
}

function OrdersByOrg() {
  const { orgType } = useStore();
  return orgType === 'farmer' ? <FarmerOrdersPage /> : <OrdersPage />;
}

function ConnectByOrg() {
  const { orgType } = useStore();
  return orgType === 'farmer' ? <FarmerNetworkPage /> : <ConnectPage />;
}
