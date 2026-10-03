import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { HelpIcon } from '@/components/ui/icons';
import { L } from '@/i18n/labels';
import { HELP, type HelpTopic } from './helpTopics';

/**
 * Nút "?" của một trang.
 *
 * Mở bảng trượt từ dưới lên chứ không mở trang mới: người đang bí thì không
 * nên bị đưa đi chỗ khác, đóng lại là thấy đúng chỗ mình vừa đứng.
 */
export function HelpButton({ topic }: { readonly topic: HelpTopic }) {
  const [open, setOpen] = useState(false);
  const { body, Icon } = HELP[topic];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={L.helpButton}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-rule bg-card text-ink-2"
      >
        <HelpIcon />
      </button>

      <BottomSheet open={open} title={L.helpButton} onClose={() => setOpen(false)}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-rule bg-paper text-brand">
            <Icon className="h-10 w-10" />
          </span>
          <p className="max-w-prose text-base leading-relaxed text-ink-2">{body}</p>
          <Button tone="primary" block size="lg" onClick={() => setOpen(false)}>
            {L.close}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
