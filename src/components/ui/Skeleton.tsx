interface SkeletonProps {
  readonly rows?: number;
  readonly label: string;
}

/** Khung xám trong lúc chờ dữ liệu. Có nhãn cho trình đọc màn hình. */
export function Skeleton({ rows = 3, label }: SkeletonProps) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-[var(--density-row-h)] animate-pulse rounded-xl border border-rule bg-card"
        />
      ))}
    </div>
  );
}
