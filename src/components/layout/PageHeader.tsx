import type { ReactNode } from 'react';

interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-ink lg:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {/* Nút không có nghĩa trên giấy: biên nhận in ra từng dính hàng "Gửi Zalo · In · ⋯". */}
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
