/**
 * Đơn hàng và thông báo — cửa cho màn hình. Cần mạng; hỏi lại khi đổi tổ chức.
 */

import { useCallback, useEffect, useState } from 'react';
import type { NotificationView, OrderDetail, OrderSummary } from '@mambo/contracts';
import { getOrder, listNotifications, listOrders, readNotifications } from '../orders';
import { useStore } from '../useStore';
import { useLoad, type Loaded } from './useLinked';

export { createOrder, readNotifications, scheduleOrder, stepOrder, type OrderStep } from '../orders';

/** shortcut: chỉ trang đầu (50 đơn mới nhất), thêm "Xem thêm" theo cursor khi có tổ chức vượt 50 đơn mở. */
export const useOrders = (): Loaded<readonly OrderSummary[]> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId ? async () => (await listOrders()).orders : null, currentOrgId ?? '');
};

export const useOrder = (id: string): Loaded<OrderDetail> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId ? () => getOrder(id) : null, `${currentOrgId ?? ''}:${id}`);
};

const POLL_MS = 60_000;

export interface Notifications {
  readonly items: readonly NotificationView[];
  readonly unread: number;
  readonly reload: () => void;
  /** Đánh dấu đã đọc; bỏ trống = tất cả. */
  readonly markRead: (ids?: string[]) => Promise<void>;
}

/**
 * Hỏi khi mở app và mỗi 60 giây (FRONTEND §5.8; Realtime để sau BE10). Thông báo là của TỔ CHỨC:
 * mọi thành viên cùng thấy, cùng trạng thái đã đọc. Hỏi hụt (mất mạng) thì giữ bản đang có.
 */
export function useNotifications(): Notifications {
  const { currentOrgId } = useStore();
  const [items, setItems] = useState<readonly NotificationView[]>([]);
  const [unread, setUnread] = useState(0);

  const reload = useCallback(() => {
    if (!currentOrgId) return;
    listNotifications().then(
      (r) => {
        setItems(r.notifications);
        setUnread(r.unread);
      },
      () => {},
    );
  }, [currentOrgId]);

  useEffect(() => {
    setItems([]);
    setUnread(0);
    reload();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  const markRead = useCallback(async (ids?: string[]) => {
    const r = await readNotifications(ids);
    setUnread(r.unread);
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
  }, []);

  return { items, unread, reload, markRead };
}
