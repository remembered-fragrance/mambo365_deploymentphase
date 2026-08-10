/**
 * Màn chuyển khoản.
 *
 * 🔴 NỘI DUNG CHUYỂN KHOẢN là thứ quan trọng nhất trên màn này — gõ sai là tiền
 * vào mà gói không mở. Vì vậy nó được in to, có nút chép sẵn, và ngay dưới là
 * câu nói rõ: gõ sai vẫn xử lý được, gọi Zalo. Doạ người đang trả tiền là cách
 * chắc chắn để họ dừng lại.
 *
 * Hỏi lại máy chủ theo nhịp thay vì mở kênh realtime: người dùng đang nhìn màn
 * này chờ, mà mở realtime chỉ cho một màn thì phải nuôi thêm một đường kết nối
 * cho cả app. Kéo 5 giây một lần trong lúc mở màn là đủ và bỏ đi thì không sót gì.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { CheckIcon } from '@/components/ui/icons';
import { BANK_ACCOUNT_NAME, BANK_ACCOUNT_NUMBER, BANK_NAME, SUPPORT_ZALO } from '@/config';
import { formatVnd } from '@/core/format';
import type { PaymentIntent } from '@/core/subscription';
import { transferContent } from '@/core/transferCode';
import { L } from '@/i18n/labels';
import { vietQrImageUrl } from './vietQr';

const POLL_MS = 5_000;

interface Props {
  readonly intent: PaymentIntent | null;
  readonly paid: boolean;
  readonly onPoll: () => void;
  readonly onClose: () => void;
}

function CopyRow({ label, value }: { readonly label: string; readonly value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</p>
        <p className="break-all text-base font-bold text-ink">{value}</p>
      </div>
      <Button onClick={() => void copy()}>{copied ? L.payCopied : L.payCopy}</Button>
    </div>
  );
}

export function PaymentQrDialog({ intent, paid, onPoll, onClose }: Props) {
  useEffect(() => {
    if (!intent || paid) return;
    const timer = setInterval(onPoll, POLL_MS);
    return () => clearInterval(timer);
  }, [intent, paid, onPoll]);

  if (!intent) return null;

  const content = transferContent(intent.code);

  return (
    <Dialog open title={L.payTitle} onClose={onClose}>
      {paid ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckIcon className="h-10 w-10 text-in" />
          <p className="text-lg font-bold text-ink">{L.payDone}</p>
          <Button tone="primary" block onClick={onClose}>
            {L.close}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <img
            src={vietQrImageUrl(intent.amount, content)}
            alt={L.payQrAlt}
            width={280}
            height={280}
            className="mx-auto h-auto w-full max-w-[280px] rounded-xl border border-rule bg-card"
          />

          <div className="flex flex-col">
            <CopyRow label={L.payContent} value={content} />
            <CopyRow label={L.payAmount} value={formatVnd(intent.amount)} />
            <CopyRow label={L.payAccountNumber} value={BANK_ACCOUNT_NUMBER} />
            <div className="flex justify-between gap-3 py-2 text-sm">
              <span className="text-ink-3">{L.payBank}</span>
              <span className="font-semibold text-ink">{BANK_NAME}</span>
            </div>
            <div className="flex justify-between gap-3 pb-2 text-sm">
              <span className="text-ink-3">{L.payAccountName}</span>
              <span className="font-semibold text-ink">{BANK_ACCOUNT_NAME}</span>
            </div>
          </div>

          <p className="rounded-xl border border-rule bg-paper p-3 text-sm text-ink-2">
            {L.payContentWarning} {L.supportZalo}: {SUPPORT_ZALO}
          </p>

          <p className="text-sm font-semibold text-ink-2" aria-live="polite">
            {L.payWaiting}
          </p>
          <p className="text-sm text-ink-3">{L.payWaitingHint}</p>

          <Button block onClick={onClose}>
            {L.close}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
