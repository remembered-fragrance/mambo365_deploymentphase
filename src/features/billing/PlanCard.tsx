import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDate, formatVnd } from '@/core/format';
import type { PaymentIntentStatus } from '@/core/subscription';
import { useSubscription } from '@/data/hooks/useSubscription';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { daysLeftText, planLabel, planTone } from './planText';

const INTENT_LABEL: Record<PaymentIntentStatus, string> = {
  pending: L.payStatusPending,
  paid: L.payStatusPaid,
  failed: L.payStatusFailed,
  expired: L.payStatusExpired,
};

/**
 * Thẻ gói dịch vụ trong màn Tài khoản: đang ở bậc nào, tới ngày nào, đã trả
 * những lần nào.
 *
 * Lịch sử thanh toán ghi rõ "đây là biên nhận, không phải hoá đơn đỏ". Chưa có
 * pháp nhân thì không được để người dùng tưởng đã có chứng từ đi khai thuế —
 * họ sẽ phát hiện ra vào đúng lúc cần nó nhất.
 */
export function PlanCard() {
  const { plan, quota, intents } = useSubscription();

  return (
    <Card
      title={L.planTitle}
      subtitle={plan.endsAt ? `${L.planEndsOn} ${formatDate(plan.endsAt)}` : undefined}
      action={<Badge label={planLabel(plan)} tone={planTone(plan)} />}
    >
      <div className="flex flex-col gap-3">
        {plan.tier === 'free' ? (
          <p className="text-sm text-ink-2">
            {L.quotaUsed}: <b className="text-ink">{quota.used}</b> {L.quotaOfLimit} {quota.limit}
          </p>
        ) : (
          <p className="text-sm text-ink-2">{daysLeftText(plan)}</p>
        )}

        <Link
          to={ROUTES.plans}
          className="min-h-11 rounded-xl border border-brand bg-brand px-4 py-3 text-center font-semibold text-paper"
        >
          {plan.tier === 'premium' ? L.planSeePlans : L.planUpgrade}
        </Link>

        <div>
          <p className="mb-1 text-sm font-bold text-ink">{L.payHistory}</p>
          {intents.length === 0 ? (
            <p className="text-sm text-ink-3">{L.payNoHistory}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-rule">
              {intents.map((intent) => (
                <li key={intent.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-ink-2">{formatDate(intent.createdAt)}</span>
                  <span className="text-sm font-bold text-ink">{formatVnd(intent.amount)}</span>
                  <span className="text-sm text-ink-3">{INTENT_LABEL[intent.status]}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm text-ink-3">{L.payReceiptNote}</p>
        </div>
      </div>
    </Card>
  );
}
