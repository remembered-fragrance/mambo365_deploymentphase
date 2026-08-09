import { CheckIcon, CloudIcon, CloudOffIcon, WarningIcon } from '@/components/ui/icons';

export type SyncTone = 'synced' | 'pending' | 'offline' | 'error';

interface SyncBadgeProps {
  readonly tone: SyncTone;
  readonly label: string;
}

const ICON = {
  synced: CheckIcon,
  pending: CloudIcon,
  offline: CloudOffIcon,
  error: WarningIcon,
};

const TONE: Record<SyncTone, string> = {
  synced: 'text-ink-3',
  pending: 'text-receivable',
  offline: 'text-ink-3',
  error: 'text-alert',
};

/** Màu không bao giờ là tín hiệu duy nhất: luôn kèm biểu tượng và chữ. */
export function SyncBadge({ tone, label }: SyncBadgeProps) {
  const Icon = ICON[tone];
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${TONE[tone]}`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

interface OfflineBannerProps {
  readonly message: string;
  readonly detail?: string;
}

export function OfflineBanner({ message, detail }: OfflineBannerProps) {
  return (
    <div
      role="status"
      className="no-print flex flex-wrap items-center gap-2 border-b border-rule bg-card px-4 py-2 text-sm text-ink-2"
    >
      <CloudOffIcon className="h-4 w-4 shrink-0" />
      <span className="font-semibold">{message}</span>
      {detail && <span className="text-ink-3">{detail}</span>}
    </div>
  );
}
