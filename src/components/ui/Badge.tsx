export type BadgeTone = 'in' | 'out' | 'receivable' | 'payable' | 'neutral' | 'alert';

interface BadgeProps {
  readonly label: string;
  readonly tone?: BadgeTone;
  /** Ký hiệu đi kèm — màu không bao giờ là tín hiệu duy nhất. */
  readonly mark?: string;
}

const TONE: Record<BadgeTone, string> = {
  in: 'border-in text-in',
  out: 'border-out text-out',
  receivable: 'border-receivable text-receivable',
  payable: 'border-payable text-payable',
  alert: 'border-alert text-alert',
  neutral: 'border-rule text-ink-2',
};

export function Badge({ label, tone = 'neutral', mark }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 text-xs font-bold ${TONE[tone]}`}
    >
      {mark && <span aria-hidden="true">{mark}</span>}
      {label}
    </span>
  );
}
