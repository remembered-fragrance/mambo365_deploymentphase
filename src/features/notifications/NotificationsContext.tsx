import { createContext, useContext, type ReactNode } from 'react';
import { useNotifications, type Notifications } from '@/data/hooks/useOrders';

// Một lượt hỏi cho cả app: chuông trên khung và màn Thông báo cùng đọc một chỗ, đọc xong là chuông hết số ngay.
const NotificationsContext = createContext<Notifications | null>(null);

export function NotificationsProvider({ children }: { readonly children: ReactNode }) {
  return <NotificationsContext.Provider value={useNotifications()}>{children}</NotificationsContext.Provider>;
}

export function useAppNotifications(): Notifications {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useAppNotifications ngoài NotificationsProvider');
  return value;
}
