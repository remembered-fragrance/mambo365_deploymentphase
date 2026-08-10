import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { PlanComparison } from './PlanComparison';

interface Props {
  readonly used: number;
  readonly limit: number;
}

/**
 * 🔴 Màn chạm hạn mức — điểm chuyển đổi quan trọng nhất của cả sản phẩm.
 *
 * Nói bằng SỐ CỦA CHÍNH HỌ ở dòng đầu, trước mọi thứ khác. Bảng so sánh có ở
 * dưới cho ai muốn đọc, nhưng thứ đập vào mắt phải là "tháng này bác đã ghi 30
 * phiếu" — người đọc câu đó biết ngay chuyện gì đang xảy ra, còn người đọc một
 * bảng tính năng thì không.
 *
 * Hai câu trấn an đi kèm, vì cả hai đều đúng và cả hai đều là thứ người dùng
 * đang lo: phiếu đang cân dở không mất, và sang tháng là đếm lại từ đầu.
 */
export function QuotaWall({ used, limit }: Props) {
  return (
    <PageContainer width="content">
      <Card title={L.quotaWallTitle}>
        <div className="flex flex-col gap-3">
          <p className="text-3xl font-extrabold text-ink">
            {used}
            <span className="text-lg font-semibold text-ink-3"> / {limit}</span>
          </p>
          <p className="text-base text-ink-2">{L.quotaWallBody}</p>

          <Link
            to={ROUTES.plans}
            className="min-h-14 rounded-xl border border-brand bg-brand px-5 py-4 text-center text-lg font-semibold text-paper"
          >
            {L.planUpgrade}
          </Link>

          <p className="text-sm text-ink-3">{L.quotaDraftsKept}</p>
          <p className="text-sm text-ink-3">{L.quotaResetHint}</p>
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
