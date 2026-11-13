/**
 * Đơn hàng và thông báo — cửa cho màn hình. Cần mạng; hỏi lại khi đổi tổ chức.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationView, OrderDetail, OrderSummary } from '@mambo/contracts';
import { getOrder, listNotifications, listOrders, readNotifications } from '../orders';
import { useStore } from '../useStore';
import { useLoad, type Loaded } from './useLinked';

export { createOrder, readNotifications, scheduleOrder, stepOrder, type OrderStep } from '../orders';

/**
 * Số lần máy chủ gỡ phiếu / nháp khỏi đơn (`ORDER_NOT_OPEN`) trong phiên — tăng thì đơn đã đổi (huỷ, không
 * còn), hỏi lại danh sách để người cân không tưởng đơn vẫn mở.
 */
const useOrdersStamp = (): string => {
  const { currentOrgId, syncWarnings } = useStore();
  return `${currentOrgId ?? ''}:${syncWarnings.filter((w) => w.code === 'ORDER_NOT_OPEN').length}`;
};

/** shortcut: chỉ trang đầu (50 đơn mới nhất), thêm "Xem thêm" theo cursor khi có tổ chức vượt 50 đơn mở. */
export const useOrders = (): Loaded<readonly OrderSummary[]> => {
  const { currentOrgId } = useStore();
  const stamp = useOrdersStamp();
  return useLoad(currentOrgId ? async () => (await listOrders()).orders : null, stamp);
};

export const useOrder = (id: string): Loaded<OrderDetail> => {
  const { currentOrgId } = useStore();
  const stamp = useOrdersStamp();
  return useLoad(currentOrgId ? () => getOrder(id) : null, `${stamp}:${id}`);
};

const POLL_MS = 60_000;

/**
 * Thông báo `plan.activated` chưa thấy ở lần hỏi trước — gói vừa kích hoạt ngoài app. `seen = null` (lần hỏi đầu
 * của tổ chức) chỉ ghi nhận: app vừa mở đã đọc gói mới rồi.
 */
export const newPlanActivations = (
  seen: ReadonlySet<string> | null,
  items: readonly NotificationView[],
): { readonly fresh: boolean; readonly seen: ReadonlySet<string> } => {
  const ids = items.filter((n) => n.kind === 'plan.activated').map((n) => n.id);
  return { fresh: seen !== null && ids.some((id) => !seen.has(id)), seen: new Set([...(seen ?? []), ...ids]) };
};

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
  const { currentOrgId, refreshPlan } = useStore();
  const [items, setItems] = useState<readonly NotificationView[]>([]);
  const [unread, setUnread] = useState(0);
  // Qua ref: `refreshPlan` đổi danh tính mỗi lần `/v1/me` trả lời — để vào deps của `reload` là dựng lại nhịp hỏi.
  const refreshPlanRef = useRef(refreshPlan);
  useEffect(() => { refreshPlanRef.current = refreshPlan; }, [refreshPlan]);
  const planSeen = useRef<ReadonlySet<string> | null>(null);

  const reload = useCallback(() => {
    if (!currentOrgId) return;
    listNotifications().then(
      (r) => {
        setItems(r.notifications);
        setUnread(r.unread);
        const plan = newPlanActivations(planSeen.current, r.notifications);
        planSeen.current = plan.seen;
        if (plan.fresh) refreshPlanRef.current();
      },
      () => {},
    );
  }, [currentOrgId]);

  useEffect(() => {
    setItems([]);
    setUnread(0);
    planSeen.current = null;
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
