import { useEffect, useRef, useState } from 'react';
import { EXTRA_STAFF_MAX, STAFF_INCLUDED, type PaymentIntentCreateInput, type PlanCode } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { PLAN_PRICES, STAFF_PRICE, SUPPORT_ZALO } from '@/config';
import { formatDate, formatVnd } from '@mambo/core/format';
import type { PaymentIntent } from '@mambo/core/subscription';
import { useSubscription } from '@/data/hooks/useSubscription';
import { track } from '@/data/hooks/useTrack';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { PaymentQrDialog } from './PaymentQrDialog';
import { PlanComparison } from './PlanComparison';
import { daysLeftText, PLAN_NAME, planLabel, planTone } from './planText';

type Months = 1 | 12;

const PERIOD_TEXT: Readonly<Record<Months, string>> = { 1: L.payPeriodMonth, 12: L.payPeriodYear };

/** "Gói Vựa · 1 năm · thêm 2 người cân" — ghi trên màn chuyển khoản để người trả biết mình đang trả cho gì. */
const purchaseText = (input: PaymentIntentCreateInput): string => {
  if (input.kind === 'staff') {
    return `${PLAN_NAME.vua} · ${L.payExtraStaffPrefix} ${input.extraStaff} ${L.payExtraStaffSuffix}`;
  }
  const plan = input.plan ?? 'vua';
  const extra = input.extraStaff ? ` · ${L.payExtraStaffPrefix} ${input.extraStaff} ${L.payExtraStaffSuffix}` : '';
  return `${PLAN_NAME[plan]} · ${PERIOD_TEXT[input.months]}${extra}`;
};

/**
 * Màn gói dịch vụ — vựa chọn gói Thương lái (làm một mình) hoặc Vựa (có người cân), trả tháng hoặc năm (0.28.0).
 *
 * Gói năm chọn sẵn: nông nghiệp theo mùa vụ, chủ vựa có tiền vào mùa và quen trả một lần cho xong (F §3.1).
 * Giá và số tiền phải trả do MÁY CHỦ giữ (`offer`); bảng trong `config.ts` chỉ để vẽ trước khi tải xong. Máy chủ
 * từ chối (hạ gói khi còn hạn, bớt chỗ khi đang đủ người…) thì câu báo của máy chủ hiện nguyên văn.
 * Doanh nghiệp không tự mua — chỉ có câu liên hệ Zalo.
 */
export function PlansPage() {
  const { plan, planCode, intents, loading, startPayment, refresh, billingAvailable, offer } = useSubscription();
  const { plan: summary, refreshPlan } = useStore();
  const [months, setMonths] = useState<Months>(12);
  const [extraStaff, setExtraStaff] = useState(() => (summary?.plan === 'vua' ? summary.extraStaff : 0));
  const [topUp, setTopUp] = useState(1);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [buying, setBuying] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => track('plans_viewed', {}), []);

  const paid = intent !== null && intents.some((i) => i.id === intent.id && i.status === 'paid');

  // Tiền vào: đọc lại `/v1/me` để mã gói, số người cân mới tới cả app. Một lần cho mỗi ý định — `refreshPlan`
  // đổi danh tính sau mỗi lần `/v1/me` trả lời, để nó quyết định chạy lại là hỏi mãi.
  const refreshed = useRef<string | null>(null);
  useEffect(() => {
    if (!paid || !intent || refreshed.current === intent.id) return;
    refreshed.current = intent.id;
    refreshPlan();
  }, [paid, intent, refreshPlan]);

  const price = (code: PlanCode) =>
    offer?.prices.find((p) => p.plan === code && p.months === months)?.amount ?? PLAN_PRICES[code][months];
  const staffPrice = offer?.staffPrices.find((p) => p.months === months)?.amount ?? STAFF_PRICE[months];
  const topUps = offer?.staffTopUps ?? [];
  const topUpAmount = topUps.find((t) => t.extraStaff === topUp)?.amount;
  // Hạ gói chỉ khi hết hạn (chốt 30/10) — máy chủ cũng từ chối, khoá nút trước để không bày nút bấm vào là lỗi.
  const downgradeLocked = planCode === 'vua' && plan.tier === 'premium';
  const disabled = !billingAvailable || busy || loading;

  const buy = async (input: PaymentIntentCreateInput) => {
    setBusy(true);
    setError(undefined);
    try {
      setIntent(await startPayment(input));
      setBuying(purchaseText(input));
    } catch (e) {
      setError(e instanceof Error ? e.message : L.errorTitle);
    } finally {
      setBusy(false);
    }
  };

  const option = (code: PlanCode) => {
    const current = planCode === code && plan.tier !== 'free';
    // Dùng thử chưa trả đồng nào — mua lần đầu chứ chưa phải gia hạn.
    const renew = current && plan.tier !== 'trial';
    const total = price(code) + (code === 'vua' ? extraStaff * staffPrice : 0);
    const locked = code === 'thuong_lai' && downgradeLocked;
    return (
      <div className={`rounded-xl border p-4 ${code === 'vua' ? 'border-brand' : 'border-rule'}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-bold text-ink">{PLAN_NAME[code]}</p>
          {current && <Badge label={L.planCurrent} tone="in" />}
        </div>
        <p className="mt-1 text-sm text-ink-2">{code === 'vua' ? L.planVuaDesc : L.planSoloDesc}</p>
        <p className="mt-3 text-2xl font-extrabold text-ink">
          {formatVnd(price(code))}{' '}
          <span className="text-base font-semibold text-ink-3">{months === 12 ? L.pricePerYear : L.pricePerMonth}</span>
        </p>

        {code === 'vua' && (
          <div className="mt-3 flex flex-col gap-2">
            <Select
              label={L.planExtraStaff}
              value={String(extraStaff)}
              options={Array.from({ length: EXTRA_STAFF_MAX + 1 }, (_, n) => ({
                value: String(n),
                label: `${n === 0 ? L.planExtraStaffNone : `${L.payExtraStaffPrefix} ${n}`} · ${L.planExtraStaffTotal} ${STAFF_INCLUDED + n} ${L.payExtraStaffSuffix}`,
              }))}
              hint={`${STAFF_INCLUDED} ${L.planExtraStaffIncluded} ${formatVnd(staffPrice)} ${months === 12 ? L.pricePerYear : L.pricePerMonth}.`}
              onValueChange={(v) => setExtraStaff(Number.parseInt(v, 10))}
            />
            {extraStaff > 0 && (
              <p className="text-sm text-ink-2">
                {L.planTotal}: <b className="num text-ink">{formatVnd(total)}</b>
              </p>
            )}
          </div>
        )}

        {locked && plan.endsAt && (
          <p className="mt-3 text-sm text-ink-3">
            {L.planDowngradeLocked} {formatDate(plan.endsAt)}
          </p>
        )}
        <Button
          tone={code === 'vua' ? 'primary' : undefined}
          size={code === 'vua' ? 'lg' : undefined}
          block
          className="mt-3"
          disabled={disabled || locked}
          onClick={() =>
            void buy(code === 'vua' ? { kind: 'plan', plan: code, months, extraStaff } : { kind: 'plan', plan: code, months })
          }
        >
          {renew ? L.planRenew : L.planBuy}
        </Button>
      </div>
    );
  };

  return (
    <PageContainer width="content">
      <PageHeader title={L.planTitle} />

      <div className="flex flex-col gap-4">
        <Card
          title={planLabel(plan, planCode)}
          subtitle={plan.endsAt ? `${L.planEndsOn} ${formatDate(plan.endsAt)}` : undefined}
          action={plan.tier === 'free' ? undefined : <Badge label={daysLeftText(plan)} tone={planTone(plan)} />}
        >
          {plan.tier === 'free' && <p className="text-sm text-ink-2">{L.quotaResetHint}</p>}
          {summary?.staffLimit !== null && summary?.staffLimit !== undefined && plan.tier !== 'free' && (
            <p className="text-sm text-ink-2">
              {L.featureStaff}: <b className="num text-ink">{summary.staffLimit}</b>
            </p>
          )}
        </Card>

        {error && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {error}
          </p>
        )}

        {offer && !offer.selfServe ? (
          <Card title={L.planUpgrade}>
            <p role="status" className="text-sm text-ink-2">
              {L.billingContact} {L.supportZalo}: {SUPPORT_ZALO}
            </p>
          </Card>
        ) : (
          <Card title={L.planUpgrade}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Segmented
                  label={L.planPeriod}
                  value={String(months)}
                  options={[
                    { value: '12', label: L.priceYearly },
                    { value: '1', label: L.priceMonthly },
                  ]}
                  onValueChange={(v) => setMonths(v === '1' ? 1 : 12)}
                />
                {months === 12 && <p className="text-sm text-ink-2">{L.priceYearlyHint}</p>}
              </div>

              {option('vua')}
              {option('thuong_lai')}

              <p className="text-sm text-ink-3">{L.payNoAutoRenew}</p>
              <p className="text-sm text-ink-3">
                {L.payRefundNote} {L.supportZalo}: {SUPPORT_ZALO}
              </p>
            </div>
          </Card>
        )}

        {topUps.length > 0 && (
          <Card title={L.staffTopUpTitle}>
            <div className="flex flex-col gap-3">
              <Select
                label={L.staffTopUpCount}
                value={String(topUp)}
                options={topUps.map((t) => ({ value: String(t.extraStaff), label: `${t.extraStaff} · ${formatVnd(t.amount)}` }))}
                hint={plan.endsAt ? `${L.staffTopUpHint} ${formatDate(plan.endsAt)}` : undefined}
                onValueChange={(v) => setTopUp(Number.parseInt(v, 10))}
              />
              {topUpAmount !== undefined && (
                <p className="text-sm text-ink-2">
                  {L.planTotal}: <b className="num text-ink">{formatVnd(topUpAmount)}</b>
                </p>
              )}
              <Button tone="primary" block disabled={disabled} onClick={() => void buy({ kind: 'staff', extraStaff: topUp })}>
                {L.staffTopUpBuy}
              </Button>
            </div>
          </Card>
        )}

        <Card title={L.planCompareTitle}>
          <PlanComparison />
        </Card>
      </div>

      <PaymentQrDialog
        intent={intent}
        purchase={buying}
        paid={paid}
        onPoll={refresh}
        onClose={() => setIntent(null)}
      />
    </PageContainer>
  );
}
