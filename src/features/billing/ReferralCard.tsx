import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/**
 * Mã mời.
 *
 * CP4 §10 đặt giới thiệu là kênh tìm khách chính, nhưng phần thưởng thì nhóm
 * chưa chốt. Thứ phải có ngay là CƠ CHẾ GHI NHẬN — mã hiện ra, ai đăng ký bằng
 * mã nào thì database ghi lại. Thêm phần thưởng sau chỉ là đọc bảng đã có; làm
 * ngược lại thì những người giới thiệu đầu tiên không bao giờ được tính công.
 */
export function ReferralCard() {
  const { user } = useStore();
  const [copied, setCopied] = useState(false);
  const code = user?.referralCode;

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard?.writeText(code);
    setCopied(true);
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
    </Card>
  );
}
