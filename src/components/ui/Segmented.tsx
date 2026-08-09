export interface SegmentedOption {
  readonly value: string;
  readonly label: string;
}

interface SegmentedProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SegmentedOption[];
  readonly onValueChange: (value: string) => void;
}

/** Chọn một trong vài lựa chọn ngắn (Mua / Bán, Hôm nay / Tuần / Tháng). */
export function Segmented({ label, value, options, onValueChange }: SegmentedProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-xl border border-rule bg-card p-1"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onValueChange(o.value)}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition ${
              selected ? 'bg-brand text-paper' : 'text-ink-2'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
