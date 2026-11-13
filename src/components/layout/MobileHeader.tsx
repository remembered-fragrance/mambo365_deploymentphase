import type { ReactNode } from 'react';
import { Logo } from '../ui/Logo';

interface MobileHeaderProps {
  readonly appName: string;
  /**
   * Chỉ cho trang KHÔNG tự có tiêu đề (bản đồ chiếm trọn màn). Trang có `PageHeader` thì để trống:
   * header mang tên app — ghi tên trang ở đây là lặp ngay dòng tiêu đề bên dưới.
   */
  readonly title?: string;
  /** Nút ☀ Ngoài trời nằm ngay đây — người cần nó nhất là người ít tự tìm ra
   *  nó trong Cài đặt. */
  readonly themeToggle: ReactNode;
  readonly syncBadge?: ReactNode;
  readonly back?: ReactNode;
  /** Nút bấm khác của header, ví dụ kính lúp tìm nhanh. */
  readonly actions?: ReactNode;
}

export function MobileHeader({
  appName,
  title,
  themeToggle,
  syncBadge,
  back,
  actions,
}: MobileHeaderProps) {
  return (
    <header className="no-print sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-rule bg-card px-3 lg:hidden">
      {back}
      {title ? (
        <p className="flex-1 truncate text-base font-bold text-ink">{title}</p>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Logo className="h-7 w-7" />
          <p className="truncate text-base font-extrabold tracking-tight text-brand">{appName}</p>
        </div>
      )}
      {syncBadge}
      {actions}
      {themeToggle}
    </header>
  );
}
