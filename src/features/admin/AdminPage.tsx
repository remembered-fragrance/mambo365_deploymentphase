import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminFunnel } from '@/data/hooks/useAdmin';
import { L } from '@/i18n/labels';
import { ActivatePlanCard } from './ActivatePlanCard';
import { FunnelCard } from './FunnelCard';
import { ResetPasswordCard } from './ResetPasswordCard';

const DEFAULT_DAYS = 30;

/**
 * `/quan-tri` — bản nhỏ cho người vận hành: mở gói bằng tay, đặt lại mật khẩu cho khách, phễu dạng bảng.
 *
 * Ai là quản trị do MÁY CHỦ quyết (`ADMIN_USER_IDS`); `/v1/me` không nói, nên trang không có mục điều hướng và
 * không tự đoán quyền. Lời gọi phễu (chỉ đọc) là phép thử: máy chủ từ chối thì cả trang chỉ còn một câu nói rõ
 * vì sao, không bày form nào.
 */
export function AdminPage() {
  const [days, setDays] = useState(DEFAULT_DAYS);
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
      <div className="flex flex-col gap-4">
        <ActivatePlanCard />
        <ResetPasswordCard />
        {/* Chừa chỗ cho danh sách giao dịch: `GET /v1/admin/payments` chưa phát hành, chưa gọi. */}
        <Card title={L.adminPaymentsTitle}>
          <p className="text-sm text-ink-3">{L.adminPaymentsSoon}</p>
        </Card>
        <FunnelCard funnel={funnel} days={days} onDaysChange={setDays} />
      </div>
    </PageContainer>
  );
}
