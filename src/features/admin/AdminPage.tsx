import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminFunnel } from '@/data/hooks/useAdmin';
import { L } from '@/i18n/labels';
import { AccessLogTab } from './AccessLogTab';
import { ActivatePlanCard } from './ActivatePlanCard';
import { FeedbackTab } from './FeedbackTab';
import { OrganizationsTab } from './OrganizationsTab';
import { OverviewTab } from './OverviewTab';
import { PaymentsCard } from './PaymentsCard';
import { PromoTab } from './PromoTab';
import { UsersTab } from './UsersTab';

const DEFAULT_DAYS = 30;

export type AdminTab = 'overview' | 'orgs' | 'payments' | 'promo' | 'users' | 'feedback' | 'log';

const TABS: readonly { readonly value: AdminTab; readonly label: string }[] = [
  { value: 'overview', label: L.adminTabOverview },
  { value: 'orgs', label: L.adminTabOrgs },
  { value: 'payments', label: L.adminTabPayments },
  { value: 'promo', label: L.adminTabPromo },
  { value: 'users', label: L.adminTabUsers },
  { value: 'feedback', label: L.adminTabFeedback },
  { value: 'log', label: L.adminTabLog },
];

/**
 * `/quan-tri` — trang của người vận hành, chia mục: tổng quan, tổ chức, thanh toán (mở gói tay + giao dịch), mã sáng
 * lập, người dùng (tìm + đặt lại mật khẩu), phản hồi, nhật ký quản trị.
 *
 * Ai là quản trị do MÁY CHỦ quyết (`ADMIN_USER_IDS`); `/v1/me` không nói, nên trang không có mục điều hướng và
 * không tự đoán quyền. Lời gọi phễu (chỉ đọc) là phép thử: máy chủ từ chối thì cả trang chỉ còn một câu nói rõ
 * vì sao, không bày form nào.
 */
export function AdminPage() {
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [tab, setTab] = useState<AdminTab>('overview');
  // Mở gói từ trang chi tiết tổ chức: mã tổ chức điền sẵn; đổi giá trị là dựng lại form (`key`).
  const [activateTarget, setActivateTarget] = useState('');
  const funnel = useAdminFunnel(days);

  if (funnel.denied) {
    return (
      <PageContainer width="content">
        <EmptyState title={L.adminDeniedTitle} description={funnel.denied} icon="🔒" />
      </PageContainer>
    );
  }

  // Chưa có câu trả lời đầu tiên thì chưa bày form. Có rồi thì đổi khoảng ngày không dựng lại form đang gõ dở.
  if (!funnel.data && !funnel.error) {
    return (
      <PageContainer width="content">
        <Skeleton rows={4} label={L.loading} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="content">
      <PageHeader title={L.adminTitle} subtitle={L.adminSubtitle} />
      {/* Bảy mục không vừa một hàng ở điện thoại — cuộn ngang thanh chia mục, không cuộn cả trang. */}
      <div className="mb-4 overflow-x-auto">
        <Segmented label={L.adminTabs} value={tab} options={TABS} onValueChange={(v) => setTab(v as AdminTab)} />
      </div>
      {tab === 'overview' && <OverviewTab funnel={funnel} days={days} onDaysChange={setDays} />}
      {tab === 'orgs' && (
        <OrganizationsTab
          onActivate={(id) => {
            setActivateTarget(id);
            setTab('payments');
          }}
        />
      )}
      {tab === 'payments' && (
        <div className="flex flex-col gap-4">
          <ActivatePlanCard key={activateTarget} initialTarget={activateTarget} />
          <PaymentsCard />
        </div>
      )}
      {tab === 'promo' && <PromoTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'log' && <AccessLogTab />}
    </PageContainer>
  );
}
