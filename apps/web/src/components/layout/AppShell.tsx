import type { ReactNode } from 'react';

interface AppShellProps {
  readonly sidebar: ReactNode;
  readonly topbar: ReactNode;
  readonly mobileHeader: ReactNode;
  readonly banner?: ReactNode;
  readonly bottomNav: ReactNode;
  readonly children: ReactNode;
}

/**
 * Khung ứng dụng: sidebar + topbar ở màn rộng, header + thanh dưới ở màn hẹp.
 * Không trang nào tự dựng khung — nếu mỗi trang tự làm thì mỗi trang lệch một kiểu.
 */
export function AppShell({
  sidebar,
  topbar,
  mobileHeader,
  banner,
  bottomNav,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh bg-paper">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        {mobileHeader}
        {banner}
        <main className="flex-1">{children}</main>
      </div>
      {bottomNav}
    </div>
  );
}

interface AppTopbarProps {
  readonly actions: ReactNode;
  readonly syncBadge?: ReactNode;
}

export function AppTopbar({ actions, syncBadge }: AppTopbarProps) {
  return (
    <header className="no-print sticky top-0 z-20 hidden min-h-14 items-center gap-3 border-b border-rule bg-card px-6 lg:flex">
      <div className="ml-auto flex items-center gap-2">
        {syncBadge}
        {actions}
      </div>
    </header>
  );
}
