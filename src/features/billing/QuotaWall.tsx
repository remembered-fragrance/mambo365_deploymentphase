import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { track } from '@/data/hooks/useTrack';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { PlanComparison } from './PlanComparison';

/**
 * 🔴 Màn chặn ghi phiếu khi hết dùng thử / hết hạn — điểm chuyển đổi quan trọng nhất của cả sản phẩm.
 *
 * Bảng giá Giai đoạn 1 (chốt 10/11/2026): hết hạn thì sổ chỉ còn xem, không ghi phiếu mới (trước là 30 phiếu mỗi
 * tháng). Câu đầu nói thẳng chuyện đó, câu sau trấn an đúng thứ người dùng đang lo: dữ liệu cũ còn nguyên, vẫn xem
 * và xuất được; phiếu đang cân dở không mất. Bảng so sánh ở dưới cho ai muốn đọc.
 */
export function QuotaWall() {
  useEffect(() => track('quota_wall_shown', { feature: 'other' }), []);
  return (
    <PageContainer width="content">
      <Card title={L.quotaWallTitle}>
        <div className="flex flex-col gap-3">
          <p className="text-base text-ink-2">{L.quotaWallBody}</p>

          <Link
            to={ROUTES.plans}
            className="min-h-14 rounded-xl border border-brand bg-brand px-5 py-4 text-center text-lg font-semibold text-paper"
          >
            {L.planUpgrade}
          </Link>

          <p className="text-sm text-ink-3">{L.quotaDraftsKept}</p>
        </div>
      </Card>

      <div className="mt-4">
        <Card title={L.planCompareTitle}>
          <PlanComparison />
        </Card>
      </div>
    </PageContainer>
  );
}
