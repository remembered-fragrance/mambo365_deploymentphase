export interface BarPoint {
  readonly label: string;
  readonly value: number;
  /** Giá trị đã định dạng để đọc — component không biết định dạng tiền. */
  readonly display: string;
}

interface BarChartProps {
  readonly points: readonly BarPoint[];
  readonly caption: string;
}

/**
 * Biểu đồ cột tự vẽ bằng div — chưa cần thư viện biểu đồ cho bảy cột.
 *
 * Nhãn giá trị hiện ngay trên cột cao nhất, không giấu trong tooltip: trên
 * điện thoại không có chuột để rê, tooltip là con số không ai đọc được.
 */
export function BarChart({ points, caption }: BarChartProps) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const peak = points.reduce<BarPoint | undefined>(
    (best, p) => (best === undefined || p.value > best.value ? p : best),
    undefined,
  );

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{caption}</figcaption>
      <div className="flex h-32 items-end gap-1.5">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            {point === peak && point.value > 0 && (
              <span className="num text-[11px] font-bold text-ink-2">{point.display}</span>
            )}
            <div
              className="w-full rounded-t bg-brand"
              style={{ height: `${Math.max((point.value / max) * 100, 2)}%` }}
              role="img"
              aria-label={`${point.label}: ${point.display}`}
            />
            <span className="truncate text-[11px] text-ink-3">{point.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
