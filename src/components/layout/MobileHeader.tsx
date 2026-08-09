import type { ReactNode } from 'react';

interface MobileHeaderProps {
  readonly title: string;
  /** Nút ☀ Ngoài trời nằm ngay đây — người cần nó nhất là người ít tự tìm ra
   *  nó trong Cài đặt. */
  readonly themeToggle: ReactNode;
  readonly syncBadge?: ReactNode;
  readonly back?: ReactNode;
}

export function MobileHeader({ title, themeToggle, syncBadge, back }: MobileHeaderProps) {
  return (
    <header className="no-print sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-rule bg-card px-3 lg:hidden">
      {back}
      <p className="flex-1 truncate text-base font-bold text-ink">{title}</p>
      {syncBadge}
      {themeToggle}
    </header>
  );
}
