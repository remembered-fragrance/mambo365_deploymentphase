export interface BarPoint {
  readonly label: string;
  /** Dòng nhỏ dưới nhãn, vd. ngày/tháng — "Thứ 6" không cho biết là tuần này hay tuần trước. */
  readonly sublabel?: string;
  readonly value: number;
  /** Giá trị đã định dạng để đọc — component không biết định dạng tiền. */
  readonly display: string;
  /** Tô đậm cột này (vd. hôm nay) — các cột khác nhạt đi để mắt tìm thấy ngay. */
  readonly highlight?: boolean;
}

interface BarChartProps {
  readonly points: readonly BarPoint[];
  readonly caption: string;
}

/**
 * Biểu đồ cột tự vẽ bằng div — chưa cần thư viện biểu đồ cho bảy cột.
 *
 * Không ghi số trên đầu cột: số tiền đủ (9.828.000₫) rộng hơn cột ở 320px. Nơi dùng tự ghi
 * con số cần đọc bên dưới biểu đồ; số từng cột vẫn nằm trong `aria-label`.
 */
export function BarChart({ points, caption }: BarChartProps) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{caption}</figcaption>
      <div className="flex h-32 items-end gap-1.5">
        {points.map((point) => (
          <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
            {/* Chiều cao % chỉ tính được khi khung cha có chiều cao: vùng cột chiếm phần còn lại. */}
            <div className="flex min-h-0 w-full flex-1 items-end">
              <div
                className={`w-full rounded-t ${barColor(point)}`}
                style={{ height: `${Math.max((point.value / max) * 100, 2)}%` }}
                role="img"
                aria-label={`${point.label}: ${point.display}`}
              />
            </div>
            <span className={`truncate text-[11px] ${point.highlight ? 'font-bold text-ink' : 'text-ink-3'}`}>
              {point.label}
            </span>
            {point.sublabel && <span className="num truncate text-[11px] text-ink-3">{point.sublabel}</span>}
          </div>
        ))}
      </div>
    </figure>
  );
}

// Ngày không mua gì vẫn có vạch màu kẻ: vạch xanh 2% trông như "có mua chút ít".
const barColor = (point: BarPoint): string =>
  point.value === 0 ? 'bg-rule' : point.highlight ? 'bg-brand' : 'bg-brand/45';
