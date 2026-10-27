import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '@mambo/core/format';
import type { NotificationKind, NotificationView } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { useAppNotifications } from './NotificationsContext';

/** Loại app biết vẽ. Loại khác (member.*, plan.* trừ plan.activated — BE6/BE7) bỏ qua cho tới khi có màn tương ứng. */
const VERB: Partial<Record<NotificationKind, string>> = {
  'order.submitted': L.notifyOrderSubmitted,
  'order.accepted': L.notifyOrderAccepted,
  'order.scheduled': L.notifyOrderScheduled,
  'order.cancelled': L.notifyOrderCancelled,
  'order.fulfilled': L.notifyOrderFulfilled,
  'link.accepted': L.notifyLinkAccepted,
  'link.revoked': L.notifyLinkRevoked,
};

export const notificationText = (n: Pick<NotificationView, 'kind' | 'from'>): string | null => {
  // Xác nhận thanh toán cho khách (G1.2): máy chủ ghi khi tiền vào và gói được gia hạn — không có bên gửi.
  if (n.kind === 'plan.activated') return L.notifyPlanActivated;
  const verb = VERB[n.kind];
  return verb ? `${n.from?.name ?? L.notifySomeone} ${verb}` : null;
};

export function NotificationsPage() {
  const { items, unread, reload, markRead } = useAppNotifications();
  const navigate = useNavigate();
  const shown = items.filter((n) => notificationText(n) !== null);

  useEffect(reload, [reload]);

  const open = (n: NotificationView) => {
    if (!n.read) void markRead([n.id]).catch(() => {});
    if (n.orderId) navigate(ROUTES.orderDetail(n.orderId));
  };

  return (
    <PageContainer width="content">
      <PageHeader
        title={L.navNotifications}
        actions={
          unread > 0 && <Button onClick={() => void markRead().catch(() => {})}>{L.notificationsReadAll}</Button>
        }
      />
      {shown.length === 0 ? (
        <EmptyState title={L.notificationsEmpty} icon="🔔" />
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={`card flex w-full flex-col items-start gap-1 p-4 text-left ${n.read ? '' : 'border-brand'}`}
              >
                <span className={`text-base text-ink ${n.read ? '' : 'font-bold'}`}>{notificationText(n)}</span>
                {n.pickupAt && (
                  <span className="num text-sm text-ink-2">
                    {L.orderPickup}: {formatDateTime(n.pickupAt)}
                  </span>
                )}
                <span className="num text-sm text-ink-3">{formatDateTime(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
