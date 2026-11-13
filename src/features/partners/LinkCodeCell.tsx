import { useState } from 'react';
import type { PartnerKind } from '@mambo/contracts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatLinkCode, inviteLink, linkErrorMessage } from '@/data/hooks/useLinked';
import { L } from '@/i18n/labels';
import type { LinkState } from './linkState';

interface LinkCodeCellProps {
  readonly state: LinkState;
  readonly partnerKind: PartnerKind;
  readonly partnerId: string;
  /** Lấy mã xong thì tải lại danh sách kết nối — cả ô này lẫn thẻ chi tiết thấy mã mới. */
  readonly onChanged: () => void;
}

/** Ô "Kết nối" trên danh sách Nông hộ / Người mua: đã kết nối, mã đang chờ nhập, hoặc nút lấy mã. */
export function LinkCodeCell({ state, partnerKind, partnerId, onChanged }: LinkCodeCellProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (state.kind === 'linked') return <Badge tone="in" label={L.linkLinkedTag} />;
  if (state.kind === 'pending') {
    return (
      <span className="num select-all whitespace-nowrap text-base font-extrabold tracking-widest text-ink" title={L.partnerInviteCode}>
        {formatLinkCode(state.code.code)}
      </span>
    );
  }

  const ask = async () => {
    setBusy(true);
    try {
      await inviteLink(partnerKind, partnerId);
      onChanged();
    } catch (err) {
      toast({ message: linkErrorMessage(err, L.partnerNotSynced), tone: 'alert' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        void ask();
      }}
    >
      {L.linkGetCode}
    </Button>
  );
}
