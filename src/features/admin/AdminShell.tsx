import type { ComponentType, ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import {
  BuildingIcon,
  CardIcon,
  ChartIcon,
  ClockIcon,
  GiftIcon,
  MoonIcon,
  PeopleIcon,
  StarIcon,
  SunIcon,
} from '@/components/ui/icons';
import { L } from '@/i18n/labels';
import { useTheme } from '../shared/useTheme';

export type AdminSection = 'tong-quan' | 'to-chuc' | 'thanh-toan' | 'ma-sang-lap' | 'nguoi-dung' | 'phan-hoi' | 'nhat-ky';

interface SectionDef {
  readonly id: AdminSection;
  readonly label: string;
  readonly description: string;
  readonly Icon: ComponentType<{ readonly className?: string }>;
}

export const ADMIN_SECTIONS: readonly SectionDef[] = [
  { id: 'tong-quan', label: L.adminTabOverview, description: L.adminOverviewDesc, Icon: ChartIcon },
  { id: 'to-chuc', label: L.adminTabOrgs, description: L.adminOrgsDesc, Icon: BuildingIcon },
  { id: 'thanh-toan', label: L.adminTabPayments, description: L.adminPaymentsDesc, Icon: CardIcon },
  { id: 'ma-sang-lap', label: L.adminTabPromo, description: L.adminPromoDesc, Icon: GiftIcon },
  { id: 'nguoi-dung', label: L.adminTabUsers, description: L.adminUsersDesc, Icon: PeopleIcon },
  { id: 'phan-hoi', label: L.adminTabFeedback, description: L.adminFeedbackDesc, Icon: StarIcon },
  { id: 'nhat-ky', label: L.adminTabLog, description: L.adminLogDesc, Icon: ClockIcon },
];

export const isAdminSection = (raw: string | null): raw is AdminSection => ADMIN_SECTIONS.some((s) => s.id === raw);

interface AdminShellProps {
  readonly section: AdminSection;
  readonly onSectionChange: (section: AdminSection) => void;
  /** Tên / số của tài khoản đang đăng nhập — để người vận hành biết mình đang dùng tài khoản nào. */
  readonly account: string;
  readonly onSignOut: () => void;
  readonly children: ReactNode;
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <p className="text-lg font-extrabold tracking-tight text-brand">{L.appName}</p>
      <span className="whitespace-nowrap rounded-md border border-brand px-1.5 py-0.5 text-xs font-bold text-brand">{L.adminConsole}</span>
    </div>
  );
}

/**
 * Khung riêng của trang quản trị — KHÔNG dùng khung app (menu sổ, đơn, bản đồ của vựa / nông dân). Máy tính: menu trái
 * bảy mục; điện thoại: thanh trên cùng + hàng mục cuộn ngang. Nội dung rộng tới 72rem cho bảng nhiều cột.
 */
export function AdminShell({ section, onSectionChange, account, onSignOut, children }: AdminShellProps) {
  const { theme, cycleTheme } = useTheme();
  const current = ADMIN_SECTIONS.find((s) => s.id === section) ?? ADMIN_SECTIONS[0];

  const themeButton = (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${L.themeSwitch}: ${theme === 'sun' ? L.themeSun : theme === 'night' ? L.themeNight : L.themeDay}`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-2"
    >
      {theme === 'night' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  );

  return (
    <div className="flex min-h-dvh bg-paper text-ink">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-rule bg-card lg:flex">
        <div className="px-4 py-5">
          <Brand />
        </div>
        <nav aria-label={L.adminTabs} className="flex-1 overflow-y-auto px-3">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {ADMIN_SECTIONS.map(({ id, label, Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  aria-current={id === section ? 'page' : undefined}
                  onClick={() => onSectionChange(id)}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm font-medium ${
                    id === section ? 'bg-paper text-brand' : 'text-ink-2'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 border-t border-rule p-3">
          <p className="px-2 text-xs text-ink-3">
            {L.adminSignedInAs}
            <span className="block truncate text-sm font-semibold text-ink-2">{account}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-11 flex-1 rounded-lg border border-rule px-3 text-sm font-semibold text-ink-2"
            >
              {L.signOut}
            </button>
            {themeButton}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-10 border-b border-rule bg-card lg:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <Brand />
            <div className="flex items-center">
              {themeButton}
              <button type="button" onClick={onSignOut} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-ink-2">
                {L.signOut}
              </button>
            </div>
          </div>
          <nav aria-label={L.adminTabs} className="overflow-x-auto px-2 pb-2">
            <ul className="m-0 flex w-max list-none gap-1 p-0">
              {ADMIN_SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={id === section ? 'page' : undefined}
                    onClick={() => onSectionChange(id)}
                    className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${id === section ? 'bg-brand text-paper' : 'text-ink-2'}`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 lg:px-8">
          <div className="mb-5">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">{current?.label}</h1>
            <p className="text-sm text-ink-3">{current?.description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
