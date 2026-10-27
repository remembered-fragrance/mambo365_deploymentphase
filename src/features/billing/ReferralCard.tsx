import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { AccountProfileController } from '@/data/hooks/useAccountProfile';
import { L } from '@/i18n/labels';

/**
 * Mã mời.
 *
 * CP4 §10 đặt giới thiệu là kênh tìm khách chính, nhưng phần thưởng thì nhóm
 * chưa chốt. Thứ phải có ngay là CƠ CHẾ GHI NHẬN — mã hiện ra, ai đăng ký bằng
 * mã nào thì database ghi lại. Thêm phần thưởng sau chỉ là đọc bảng đã có; làm
 * ngược lại thì những người giới thiệu đầu tiên không bao giờ được tính công.
 */
export function ReferralCard({ account }: { readonly account: AccountProfileController }) {
  const [copied, setCopied] = useState(false);
  const [codeToClaim, setCodeToClaim] = useState(account.pendingReferralCode ?? '');
  const [claimResult, setClaimResult] = useState<string | null>(null);
  const code = account.profile?.referralCode;

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard?.writeText(code);
    setCopied(true);
  };

  const claim = async () => {
    if (!codeToClaim.trim()) return;
    setClaimResult(null);
    try {
      const claimed = await account.submitReferral(codeToClaim);
      setClaimResult(claimed ? L.referralClaimed : L.referralClaimNotApplied);
    } catch { /* Account controller exposes the API error. */ }
  };

  return (
    <Card title={L.referralTitle} subtitle={L.referralHint}>
      {code ? (
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-2xl font-extrabold tracking-widest text-ink">{code}</p>
          <Button onClick={() => void copy()}>{copied ? L.payCopied : L.payCopy}</Button>
        </div>
      ) : (
        <p className="text-sm text-ink-3">{L.referralNone}</p>
      )}
      {account.profile?.referred ? (
        <p className="mt-4 text-sm text-ink-2">{L.referralAlreadyClaimed}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1"><Input label={L.referralClaimTitle} value={codeToClaim} autoCapitalize="characters" onChange={(event) => setCodeToClaim(event.target.value.toUpperCase())} /></div>
          <Button disabled={!account.profile || !codeToClaim.trim() || account.saving || account.loading} onClick={() => void claim()}>{L.referralClaim}</Button>
        </div>
      )}
      {claimResult && <p role="status" className="mt-2 text-sm text-ink-2">{claimResult}</p>}
      {account.error && <p role="alert" className="mt-2 text-sm text-alert">{account.error}</p>}
    </Card>
  );
}
