import { Link } from 'react-router-dom';
import { BellIcon } from '@/components/ui/icons';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { useAppNotifications } from './NotificationsContext';

/** Chuông trên khung app, kèm số thông báo chưa đọc của tổ chức. */
export function NotificationBell() {
  const { unread } = useAppNotifications();
  return (
    <Link
      to={ROUTES.notifications}
      aria-label={unread > 0 ? `${L.navNotifications}: ${unread}` : L.navNotifications}
      className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-2"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="num absolute right-1 top-1 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-4 text-paper">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
