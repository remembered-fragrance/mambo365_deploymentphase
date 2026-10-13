import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PRICE_MONTHLY, PRICE_YEARLY, SUPPORT_ZALO } from '@/config';
import { formatDate, formatVnd } from '@mambo/core/format';
import type { PaymentIntent } from '@mambo/core/subscription';
import { useSubscription } from '@/data/hooks/useSubscription';
import { track } from '@/data/hooks/useTrack';
import { L } from '@/i18n/labels';
import { PaymentQrDialog } from './PaymentQrDialog';
import { PlanComparison } from './PlanComparison';
import { daysLeftText, planLabel, planTone } from './planText';

/**
 * Màn gói dịch vụ.
 *
 * Gói năm đứng trước gói tháng và là nút chính: nông nghiệp theo mùa vụ, chủ
 * vựa có tiền vào mùa và quen trả một lần cho xong (F §3.1).
 */
export function PlansPage() {
  const { plan, intents, loading, startPayment, refresh, billingAvailable, offer } = useSubscription();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => track('plans_viewed', {}), []);

  const paid = intent !== null && intents.some((i) => i.id === intent.id && i.status === 'paid');

  // Giá máy chủ giữ (đúng số tiền của ý định); config chỉ để vẽ trước khi tải xong.
  const price = (months: 1 | 12, fallback: number) =>
    offer?.prices.find((p) => p.months === months)?.amount ?? fallback;

  const buy = async (months: 1 | 12) => {
    setBusy(true);
    setError(undefined);
    try {
      setIntent(await startPayment(months));
    } catch (e) {
      setError(e instanceof Error ? e.message : L.errorTitle);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer width="content">
      <PageHeader title={L.planTitle} />

      <div className="flex flex-col gap-4">
        <Card
          title={planLabel(plan)}
          subtitle={plan.endsAt ? `${L.planEndsOn} ${formatDate(plan.endsAt)}` : undefined}
          action={plan.tier === 'free' ? undefined : <Badge label={daysLeftText(plan)} tone={planTone(plan)} />}
        >
          {plan.tier === 'free' && <p className="text-sm text-ink-2">{L.quotaResetHint}</p>}
        </Card>

        <Card title={L.planUpgrade}>
          <div className="flex flex-col gap-3">
            {offer && !offer.selfServe && (
              <p role="status" className="text-sm text-ink-2">
                {L.billingContact} {L.supportZalo}: {SUPPORT_ZALO}
              </p>
            )}
            <div className="rounded-xl border border-brand p-4">
              <p className="text-sm font-semibold text-ink-2">{L.priceYearly}</p>
              <p className="text-2xl font-extrabold text-ink">
                {formatVnd(price(12, PRICE_YEARLY))}{' '}
                <span className="text-base font-semibold text-ink-3">{L.pricePerYear}</span>
              </p>
              <p className="mt-1 text-sm text-ink-2">{L.priceYearlyHint}</p>
              <Button
                tone="primary"
                size="lg"
                block
                className="mt-3"
                disabled={!billingAvailable || busy || loading}
                onClick={() => void buy(12)}
              >
                {L.planUpgrade}
              </Button>
            </div>

            <div className="rounded-xl border border-rule p-4">
              <p className="text-sm font-semibold text-ink-2">{L.priceMonthly}</p>
              <p className="text-xl font-bold text-ink">
                {formatVnd(price(1, PRICE_MONTHLY))}{' '}
                <span className="text-base font-semibold text-ink-3">{L.pricePerMonth}</span>
              </p>
              <Button
                block
                className="mt-3"
                disabled={!billingAvailable || busy || loading}
                onClick={() => void buy(1)}
              >
                {L.planUpgrade}
              </Button>
            </div>

            {error && <p className="text-sm font-medium text-alert">{error}</p>}

            <p className="text-sm text-ink-3">{L.payNoAutoRenew}</p>
            <p className="text-sm text-ink-3">
              {L.payRefundNote} {L.supportZalo}: {SUPPORT_ZALO}
            </p>
          </div>
        </Card>

        <Card title={L.planCompareTitle}>
          <PlanComparison />
        </Card>
      </div>

      <PaymentQrDialog
        intent={intent}
        paid={paid}
        onPoll={refresh}
        onClose={() => setIntent(null)}
      />
    </PageContainer>
  );
}
