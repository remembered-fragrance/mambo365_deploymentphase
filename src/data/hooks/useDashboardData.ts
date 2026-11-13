/**
 * Hook tập trung dữ liệu bổ trợ cho Dashboard (Đơn hàng, Kết nối, Báo cáo server).
 *
 * Chỉ gọi API khi có backend và tổ chức có tính năng / quyền tương ứng.
 * Xử lý an toàn khi mất mạng, chuyển đổi currentOrgId và hủy bỏ request cũ.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LinkedBalanceItem,
  LinkedReceipt,
  OrderSummary,
  ReportSummary,
} from '@mambo/contracts';
import { api, hasBackend } from '../client';
import { firstDashboardError, setDashboardSourceError, type DashboardDataErrors } from '../dashboardDataModel';
import { looksOnline } from '../sync';
import { useStore } from '../useStore';

export interface DashboardDataValue {
  readonly orders: readonly OrderSummary[];
  readonly pendingOrdersCount: number;
  readonly scheduledTodayCount: number;
  readonly linkedBalances: readonly LinkedBalanceItem[];
  readonly linkedReceipts: readonly LinkedReceipt[];
  readonly reportSummary: ReportSummary | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly errors: DashboardDataErrors;
  readonly refresh: () => void;
}

const isToday = (isoDate: string | null | undefined): boolean => {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

export function useDashboardData(): DashboardDataValue {
  const { currentOrgId, currentOrg, orgType, permissions, features } = useStore();
  const userRole = currentOrg?.role;
  const branchId = currentOrg?.branch?.id;

  const [orders, setOrders] = useState<readonly OrderSummary[]>([]);
  const [linkedBalances, setLinkedBalances] = useState<readonly LinkedBalanceItem[]>([]);
  const [linkedReceipts, setLinkedReceipts] = useState<readonly LinkedReceipt[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<DashboardDataErrors>({});

  const fetchId = useRef(0);

  const canReadOrders =
    features.includes('orders') &&
    (permissions.includes('order:create') || permissions.includes('order:respond'));
  const canReadLinked = features.includes('links') && permissions.includes('linked:read');
  const canReadReport = permissions.includes('report:view');

  const fetchData = useCallback(async () => {
    const id = ++fetchId.current;

    if (!currentOrgId) {
      setOrders([]);
      setLinkedBalances([]);
      setLinkedReceipts([]);
      setReportSummary(null);
      setErrors({});
      setLoading(false);
      return;
    }
    // Không biến trạng thái thiếu API/mất mạng thành một dashboard rỗng như thể
    // server xác nhận không có dữ liệu.
    if (!hasBackend() || !looksOnline()) {
      setOrders([]);
      setLinkedBalances([]);
      setLinkedReceipts([]);
      setReportSummary(null);
      setErrors({ environment: !hasBackend()
        ? 'Chưa kết nối được máy chủ API. Kiểm tra cấu hình rồi thử lại.'
        : 'Không có kết nối mạng để tải dữ liệu mới.' });
      setLoading(false);
      return;
    }

    // Nếu tổ chức hiện tại không có quyền gì cần lấy qua API
    if (!canReadOrders && !canReadLinked && !canReadReport) {
      setOrders([]);
      setLinkedBalances([]);
      setLinkedReceipts([]);
      setReportSummary(null);
      setErrors({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const promises: Promise<unknown>[] = [];

      // 1. Đơn hàng (Trader, Farmer, Enterprise nếu bật tính năng orders)
      if (canReadOrders) {
        promises.push(
          api.orders
            .list({ limit: 50 })
            .then((res) => {
              if (id === fetchId.current) setOrders(res.orders);
            })
            .catch((err: unknown) => {
              if (id === fetchId.current) {
                console.warn('Cannot load orders for dashboard', err);
                setErrors((previous) => setDashboardSourceError(previous, 'orders', dashboardErrorMessage(err, 'Không tải được đơn hàng.')));
              }
            }),
        );
      } else if (id === fetchId.current) {
        setOrders([]);
      }

      // 2. Liên kết & Công nợ đối tác liên kết (Đặc biệt cho Farmer)
      if (canReadLinked) {
        promises.push(
          api.linked
            .balance()
            .then(async (res) => {
              if (id !== fetchId.current) return;
              setLinkedBalances(res.items);

              // Dashboard chỉ cần các phiếu mới nhất của những kết nối hoạt động gần đây.
              // Endpoint nhận orgId riêng, nên giới hạn 5 tổ chức để tránh tạo N request lớn.
              const recentOrganizations = [...res.items]
                .filter((item) => item.lastReceiptAt)
                .sort((a, b) => Date.parse(b.lastReceiptAt ?? '') - Date.parse(a.lastReceiptAt ?? ''))
                .slice(0, 5);
              const pages = await Promise.all(recentOrganizations.map((item) =>
                api.linked.receipts({ orgId: item.organization.id, limit: 5 }),
              ));
              if (id === fetchId.current) {
                setLinkedReceipts(pages.flatMap((page) => page.receipts).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)));
              }
            })
            .catch((err: unknown) => {
              if (id === fetchId.current) {
                console.warn('Cannot load linked balance', err);
                setErrors((previous) => setDashboardSourceError(previous, 'linked', dashboardErrorMessage(err, 'Không tải được dữ liệu liên kết.')));
              }
            }),
        );
      } else if (id === fetchId.current) {
        setLinkedBalances([]);
        setLinkedReceipts([]);
      }

      // 3. Báo cáo tổng hợp server (Doanh nghiệp và nông dân có report:view)
      if (canReadReport && (orgType === 'enterprise' || orgType === 'farmer')) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // `to` của báo cáo là cận trên loại trừ; dùng đầu tháng kế tiếp để không bỏ sót
        // phiếu ở 999ms cuối cùng của ngày cuối tháng.
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        promises.push(
          api.reports
            .summary({
              from: startOfMonth.toISOString(),
              to: endOfMonth.toISOString(),
              ...(orgType === 'enterprise' && userRole === 'manager' && branchId ? { branchId } : {}),
            })
            .then((res) => {
              if (id === fetchId.current) setReportSummary(res);
            })
            .catch((err: unknown) => {
              if (id === fetchId.current) {
                console.warn('Cannot load report summary', err);
                setErrors((previous) => setDashboardSourceError(previous, 'report', dashboardErrorMessage(err, 'Không tải được báo cáo.')));
              }
            }),
        );
      } else if (id === fetchId.current) {
        setReportSummary(null);
      }

      await Promise.all(promises);
    } catch (err) {
      if (id === fetchId.current) {
        setErrors((previous) => setDashboardSourceError(previous, 'environment', dashboardErrorMessage(err, 'Không tải được dữ liệu máy chủ.')));
      }
    } finally {
      if (id === fetchId.current) {
        setLoading(false);
      }
    }
  }, [branchId, canReadLinked, canReadOrders, canReadReport, currentOrgId, orgType, userRole]);

  // Tự động tải lại khi đổi tổ chức hoặc khi mạng có lại
  useEffect(() => {
    // Reset ngay lập tức khi đổi org để không rò rỉ dữ liệu cũ
    setOrders([]);
    setLinkedBalances([]);
    setLinkedReceipts([]);
    setReportSummary(null);
    setErrors({});

    void fetchData();

    const onOnline = () => {
      void fetchData();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [currentOrgId, fetchData]);

  const pendingOrdersCount = orders.filter((o) => o.status === 'submitted').length;
  const scheduledTodayCount = orders.filter(
    (o) => o.status === 'scheduled' && isToday(o.pickupAt),
  ).length;

  return {
    orders,
    pendingOrdersCount,
    scheduledTodayCount,
    linkedBalances,
    linkedReceipts,
    reportSummary,
    loading,
    error: firstDashboardError(errors),
    errors,
    refresh: fetchData,
  };
}

function dashboardErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
