import { useState } from 'react';
import type { PlanCode, PromoView } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatDate, formatVnd } from '@mambo/core/format';
import { L } from '@/i18n/labels';
import { PLAN_NAME } from './planText';

/**
 * Mã Khách hàng sáng lập (0.29.0) — chủ vựa nhập mã được tặng, giá gói đổi ngay trên màn Gói. Mỗi tài khoản một mã;
 * đã có mã thì chỉ hiện mã và số tháng giá ưu đãi còn lại. Câu báo lỗi của máy chủ hiện nguyên văn.
 */
export function PromoCodeCard({
  promo,
  planCode,
  vuaPaidUntil,
  onRedeem,
}: {
  readonly promo: PromoView | null;
  /** Gói đang dùng — đang Vựa thì nhắc trước: mã chỉ giảm gói Thương lái mà nhập xong là gắn luôn. */
  readonly planCode: PlanCode | null;
  /** Gói Vựa đã trả còn hạn đến ngày này: máy chủ không nhận mã (`PROMO_PLAN_LOCKED`) — không bày ô nhập. */
  readonly vuaPaidUntil: string | null;
  readonly onRedeem: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const apply = async () => {
    // Kiểm dạng ngay trên máy: máy chủ chỉ trả câu chung "dữ liệu chưa đúng" cho lỗi dạng.
    if (!/^[A-Z0-9-]+$/.test(code.trim())) {
      setError(L.promoBadChars);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onRedeem(code.trim());
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : L.errorTitle);
    } finally {
      setBusy(false);
    }
  };

  if (promo) {
    return (
      <Card title={L.promoTitle}>
        <p className="text-sm text-ink-2">
          {L.promoApplied} <b className="font-mono text-ink">{promo.code}</b>: {PLAN_NAME[promo.plan]}{' '}
          <b className="num text-ink">{formatVnd(promo.monthlyAmount)}</b> {L.pricePerMonth}
        </p>
        <p role="status" className="mt-1 text-sm text-ink-2">
          {promo.periodsLeft > 0 ? (
            <>
              {L.promoLeftPrefix} <b className="num text-ink">{promo.periodsLeft}</b> {L.promoLeftSuffix}
            </>
          ) : (
            L.promoUsedUp
          )}
        </p>
      </Card>
    );
  }

  if (vuaPaidUntil) {
    return (
      <Card title={L.promoTitle}>
        <p role="status" className="text-sm text-ink-2">
          {L.promoVuaLocked} <b className="num text-ink">{formatDate(vuaPaidUntil)}</b>.
        </p>
      </Card>
    );
  }

  return (
    <Card title={L.promoTitle} subtitle={L.promoHint}>
      {planCode === 'vua' && <p className="mb-3 text-sm font-medium text-ink">{L.promoVuaWarning}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label={L.promoInput}
            value={code}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </div>
        <Button disabled={busy || !code.trim()} onClick={() => void apply()}>
          {L.promoApply}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </Card>
  );
}
