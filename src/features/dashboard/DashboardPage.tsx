import { useStore } from '@/data/useStore';
import { TraderDashboard } from './TraderDashboard';
import { FarmerDashboard } from './FarmerDashboard';
import { EnterpriseDashboard } from './EnterpriseDashboard';

/**
 * Trang Tổng quan (Dashboard) — Điều hướng hiển thị theo loại tổ chức và vai trò thành viên:
 *  - Trader (Thương lái / Thu mua): TraderDashboard (phân quyền Chủ vựa vs Nhân viên cân)
 *  - Farmer (Nông dân): FarmerDashboard (kết nối, đơn đặt lịch, công nợ vựa) — Giai đoạn 3
 *  - Enterprise (Doanh nghiệp): EnterpriseDashboard (báo cáo tổng hợp đa chi nhánh) — Giai đoạn 4
 */
export function DashboardPage() {
  const { orgType } = useStore();

  switch (orgType) {
    case 'farmer':
      return <FarmerDashboard />;
    case 'enterprise':
      return <EnterpriseDashboard />;
    case 'trader':
    default:
      return <TraderDashboard />;
  }
}
