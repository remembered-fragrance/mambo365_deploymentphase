import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderSummary } from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { api, hasBackend } from '../client';
import { useStore } from '../useStore';

export type FarmerOrderDetail = Awaited<ReturnType<typeof api.orders.get>>;
type OrderAction = 'accept' | 'reject' | 'cancel';
export type FarmerOrdersAvailability = 'available' | 'wrong-org' | 'feature-off' | 'permission-missing';

export function farmerOrdersAvailability(
  orgType: string | null,
  features: readonly string[],
  permissions: readonly string[],
): FarmerOrdersAvailability {
  if (orgType !== 'farmer') return 'wrong-org';
  if (!features.includes('orders')) return 'feature-off';
  if (!permissions.includes('order:create') && !permissions.includes('order:respond')) return 'permission-missing';
  return 'available';
}

export function useFarmerOrders() {
  const { currentOrgId, orgType, permissions, features } = useStore();
  const availability = farmerOrdersAvailability(orgType, features, permissions);
  const enabled = availability === 'available';
  const [orders, setOrders] = useState<readonly OrderSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [detail, setDetail] = useState<FarmerOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (nextCursor?: string, append = false) => {
    const id = ++requestId.current;
    if (!enabled || !currentOrgId || !hasBackend()) {
      setOrders([]);
      setCursor(null);
      if (enabled && !hasBackend()) setError('Chưa kết nối được máy chủ API. Kiểm tra cấu hình rồi thử lại.');
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await api.orders.list({ limit: 50, ...(nextCursor ? { cursor: nextCursor } : {}) });
      if (id !== requestId.current) return;
      setOrders((previous) => append ? [...previous, ...result.orders] : result.orders);
      setCursor(result.cursor);
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'Không tải được đơn hàng.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [currentOrgId, enabled]);

  useEffect(() => {
    const requests = requestId;
    setOrders([]);
    setCursor(null);
    setDetail(null);
    setError(null);
    void load();
    return () => { requests.current++; };
  }, [currentOrgId, load]);

  const createOrder = useCallback(async (input: {
    readonly counterpartOrgId: string;
    readonly crop: 'rubber' | 'cashew' | 'coffee' | 'pepper' | null;
    readonly estQuantity: number;
    readonly unit: string;
    readonly offeredPrice: number | null;
    readonly pickupAt: string | null;
    readonly pickupAddress: string | null;
    readonly note: string | null;
  }) => {
    if (!enabled || !permissions.includes('order:create')) {
      throw new Error('Tài khoản hiện tại không có quyền tạo đơn hàng.');
    }
    setMutating(true);
    setError(null);
    try {
      const order = await api.orders.create({ role: 'seller', ...input });
      await load();
      return order;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không gửi được đơn hàng.');
      throw cause;
    } finally {
      setMutating(false);
    }
  }, [enabled, load, permissions]);

  const openOrder = useCallback(async (id: string) => {
    if (!enabled || !currentOrgId || !hasBackend()) return;
    setError(null);
    try {
      setDetail(await api.orders.get(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được chi tiết đơn.');
    }
  }, [currentOrgId, enabled]);

  const performAction = useCallback(async (order: OrderSummary | FarmerOrderDetail, action: OrderAction) => {
    const permitted = action === 'cancel'
      ? order.createdByMe ? permissions.includes('order:create') : permissions.includes('order:respond')
      : permissions.includes('order:respond');
    if (!enabled || !permitted) {
      setError('Tài khoản hiện tại không có quyền thực hiện thao tác này.');
      return false;
    }
    setMutating(true);
    setError(null);
    try {
      if (action === 'accept') await api.orders.accept(order.id, { version: order.version });
      else if (action === 'reject') await api.orders.reject(order.id, { version: order.version });
      else await api.orders.cancel(order.id, { version: order.version });
      await load();
      if (detail?.id === order.id) await openOrder(order.id);
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'ORDER_STATE_CHANGED') {
        await load();
        if (detail?.id === order.id) await openOrder(order.id);
        setError('Đơn đã được cập nhật ở thiết bị khác. Danh sách đã được làm mới.');
        return false;
      } else {
        setError(cause instanceof Error ? cause.message : 'Không cập nhật được đơn hàng.');
        return false;
      }
    } finally {
      setMutating(false);
    }
  }, [detail?.id, enabled, load, openOrder, permissions]);

  return {
    orders,
    cursor,
    detail,
    setDetail,
    loading,
    loadingMore,
    mutating,
    error,
    enabled,
    availability,
    refresh: () => load(),
    loadMore: () => cursor ? load(cursor, true) : Promise.resolve(),
    createOrder,
    openOrder,
    performAction,
  };
}
