import { Link } from 'react-router-dom';
import { WarningIcon } from '@/components/ui/icons';
import { useSubscription } from '@/data/hooks/useSubscription';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

/** Nhắc trước bấy nhiêu ngày thì banner dùng thử mới xuất hiện. */
const REMIND_WITHIN_DAYS = 7;

/**
 * Banner gói dịch vụ trên khung app.
 *
 * 🔴 NHẮC, KHÔNG CHẶN. Người hết hạn vẫn ghi phiếu, vẫn xuất file, vẫn dùng máy
 * này bình thường; thứ duy nhất dừng lại là việc gửi lên mạng. Banner nói đúng
 * câu đó chứ không doạ mất dữ liệu — giữ dữ liệu làm con tin sẽ giết sản phẩm
 * trong một cộng đồng truyền miệng (F §4.2).
 *
 * Chỉ hiện khi có việc phải nói: sắp hết dùng thử, đang ân hạn, hoặc đã hết
 * hạn. Banner thường trực là banner không ai đọc.
 */
export function PlanBanner() {
  const { plan, subscription } = useSubscription();

  const expired = plan.tier === 'free' && subscription !== null;
  const trialEnding = plan.tier === 'trial' && plan.daysLeft <= REMIND_WITHIN_DAYS;
  if (!expired && !trialEnding && plan.tier !== 'grace') return null;

  const message = expired
    ? L.bannerExpired
    : plan.tier === 'grace'
      ? `${L.bannerGrace} ${plan.daysLeft} ${L.planDaysLeft}`
      : `${L.bannerTrialLeft} ${plan.daysLeft} ${L.planDaysLeft}`;

  return (
    <div
      role="status"
      className="no-print flex flex-wrap items-center gap-2 border-b border-rule bg-card px-4 py-2 text-sm text-ink-2"
    >
      <WarningIcon className="h-4 w-4 shrink-0 text-alert" />
      <span className="font-semibold">{message}</span>
      <Link to={ROUTES.plans} className="font-semibold text-brand underline">
        {expired ? L.bannerExpiredCta : L.planUpgrade}
      </Link>
    </div>
  );
}
