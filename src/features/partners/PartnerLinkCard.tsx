import { useEffect, useState } from 'react';
import { formatDate } from '@mambo/core/format';
import type { LinkSummary, PartnerKind } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatLinkCode, inviteLink, linkErrorMessage, type Loaded } from '@/data/hooks/useLinked';
import { L } from '@/i18n/labels';
import { linkUrl, qrImage } from './linkQr';
import { linkStateOf } from './linkState';

interface PartnerLinkCardProps {
  readonly partnerKind: PartnerKind;
  readonly partnerId: string;
  /** Danh sách kết nối của màn danh bạ — dùng chung để ô trong danh sách và thẻ này cùng thấy mã mới. */
  readonly links: Loaded<readonly LinkSummary[]>;
}

/**
 * Phía vựa / doanh nghiệp: mời một dòng danh bạ kết nối bằng MÃ KẾT NỐI (FRONTEND §5.6).
 * Gọi lại `invite` khi mã còn hạn trả đúng mã cũ, nên bấm nhiều lần không sinh nhiều mã.
 */
export function PartnerLinkCard({ partnerKind, partnerId, links }: PartnerLinkCardProps) {
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const state = linkStateOf(links.data ?? [], partnerId);
  const invite = state.kind === 'pending' ? state.code : null;
  const code = invite?.code;
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    setQr(null);
    if (!code) return;
    let live = true;
    void qrImage(linkUrl(code)).then((src) => live && setQr(src));
    return () => {
      live = false;
    };
  }, [code]);

  const ask = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await inviteLink(partnerKind, partnerId);
      links.reload();
    } catch (err) {
      setError(linkErrorMessage(err, L.partnerNotSynced));
    } finally {
      setBusy(false);
    }
  };

  if (links.loading && !links.data) return null;

  return (
    <Card title={L.partnerLinkTitle}>
      {state.kind === 'linked' ? (
        <p className="text-base font-bold text-ink">
          {L.partnerLinked} {state.name}
        </p>
      ) : invite ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-3">{L.partnerInviteCode}</p>
          <p className="num select-all text-3xl font-extrabold tracking-widest text-ink">{formatLinkCode(invite.code)}</p>
          <p className="num text-sm text-ink-3">
            {L.partnerInviteExpires} {formatDate(invite.expiresAt)}
          </p>
          {qr && (
            <img src={qr} alt={L.partnerInviteQrAlt} width={200} height={200} className="h-auto w-full max-w-[200px] rounded-lg" />
          )}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              onClick={() =>
                void navigator
                  .share({ text: `${L.partnerInviteShareText} ${formatLinkCode(invite.code)}`, url: linkUrl(invite.code) })
                  .catch(() => {})
              }
            >
              {L.partnerInviteShare}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">{L.partnerLinkHint}</p>
          <Button tone="primary" disabled={busy} onClick={() => void ask()}>
            {L.partnerInvite}
          </Button>
        </div>
      )}
      {(error ?? links.error) && <p className="mt-2 text-sm text-alert">{error ?? links.error}</p>}
    </Card>
  );
}
