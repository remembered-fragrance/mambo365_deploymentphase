import { useState } from 'react';
import { formatDate } from '@mambo/core/format';
import type { LinkInviteCode, PartnerKind } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatLinkCode, inviteLink, linkErrorMessage, useLinks } from '@/data/hooks/useLinked';
import { L } from '@/i18n/labels';

/**
 * Phía vựa / doanh nghiệp: mời một dòng danh bạ kết nối bằng MÃ KẾT NỐI (FRONTEND §5.6).
 * Gọi lại `invite` khi mã còn hạn trả đúng mã cũ, nên bấm nhiều lần không sinh nhiều mã.
 */
export function PartnerLinkCard({ partnerKind, partnerId }: { readonly partnerKind: PartnerKind; readonly partnerId: string }) {
  const links = useLinks();
  const [fresh, setFresh] = useState<LinkInviteCode | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const mine = links.data?.filter((l) => l.side === 'owner' && l.partner.id === partnerId && l.status !== 'revoked');
  const active = mine?.find((l) => l.status === 'active');
  const invite = fresh ?? mine?.find((l) => l.status === 'pending')?.inviteCode ?? null;

  const ask = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const link = await inviteLink(partnerKind, partnerId);
      setFresh(link.inviteCode);
    } catch (err) {
      setError(linkErrorMessage(err, L.partnerNotSynced));
    } finally {
      setBusy(false);
    }
  };

  if (links.loading && !links.data) return null;

  return (
    <Card title={L.partnerLinkTitle}>
      {active ? (
        <p className="text-base font-bold text-ink">
          {L.partnerLinked} {active.counterpart?.name ?? ''}
        </p>
      ) : invite ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-3">{L.partnerInviteCode}</p>
          <p className="num select-all text-3xl font-extrabold tracking-widest text-ink">{formatLinkCode(invite.code)}</p>
          <p className="num text-sm text-ink-3">
            {L.partnerInviteExpires} {formatDate(invite.expiresAt)}
          </p>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              onClick={() =>
                void navigator.share({ text: `${L.partnerInviteShareText} ${formatLinkCode(invite.code)}` }).catch(() => {})
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
