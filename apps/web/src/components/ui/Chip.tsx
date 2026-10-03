interface ChipProps {
  readonly label: string;
  readonly selected?: boolean;
  readonly icon?: string;
  readonly onSelect: () => void;
}

/** Nút lọc/chọn nhanh dạng viên thuốc. Trạng thái chọn có cả viền lẫn nền đậm,
 *  không chỉ dựa vào màu. */
export function Chip({ label, selected = false, icon, onSelect }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition ${
        selected ? 'border-brand bg-brand text-paper' : 'border-rule bg-card text-ink-2'
      }`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </button>
  );
}
