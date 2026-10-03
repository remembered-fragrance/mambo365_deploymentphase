import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhoneIcon } from '@/components/ui/icons';
import { APP_VERSION, SUPPORT_ZALO } from '@/config';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/** Kênh liên lạc + số phiên bản (để hỗ trợ từ xa hỏi "bác đang dùng bản nào"). */
export function SupportCard() {
  const { signOut } = useStore();
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <Card title={L.supportTitle}>
      <div className="flex flex-col gap-3">
        <a
          href={`tel:${SUPPORT_ZALO}`}
          className="num inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand px-4 font-bold text-brand"
        >
          <PhoneIcon className="h-4 w-4" />
          {L.supportZalo}: {SUPPORT_ZALO}
        </a>

        {/* Nói giờ trực THẬT. Hứa 24/7 khi chỉ có một người là mất uy tín ngay
            từ khách đầu tiên gọi lúc 10 giờ đêm. */}
        <p className="text-sm text-ink-2">{L.supportHours}</p>

        <p className="num text-sm text-ink-3">
          {L.appVersion} {APP_VERSION}
        </p>

        <Button tone="danger" block onClick={() => setConfirmOut(true)}>
          {L.signOut}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOut}
        title={L.signOutTitle}
        consequence={L.signOutConsequence}
        confirmLabel={L.signOut}
        onConfirm={() => {
          setConfirmOut(false);
          void signOut();
        }}
        onCancel={() => setConfirmOut(false)}
      />
    </Card>
  );
}
