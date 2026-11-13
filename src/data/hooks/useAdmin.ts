/**
 * Trang quản trị `/quan-tri` — cửa cho màn hình (features/ chỉ chạm data/ qua hooks).
 */

import { useCallback, useEffect, useState } from 'react';
import type { AdminFunnel, AdminPayments } from '@mambo/contracts';
import { adminDeniedMessage, adminErrorMessage, fetchFunnel, fetchPayments } from '../admin';

export {
  activateInput,
  activatePlan,
  adminErrorMessage,
  createPromoCode,
  deletePromoCode,
  fetchAccessLog,
  fetchFeedback,
  fetchOrganization,
  fetchOrganizations,
  fetchOverview,
  fetchPromoCodes,
  fetchUser,
  fetchUsers,
  ownedOrganizations,
  promoInput,
  resetInput,
  resetPassword,
  setOrganizationFeature,
} from '../admin';
export type { ActivateDraft, PromoDraft, ResetDraft } from '../admin';

export interface FunnelState {
  readonly data: AdminFunnel | null;
  readonly loading: boolean;
  /** Máy chủ không cho vào (401 / 403 / 404) — cả trang chỉ hiện câu này. */
  readonly denied: string | null;
  /** Lỗi khác (mạng, máy chủ) — chưa biết gì về quyền. */
  readonly error: string | null;
  readonly reload: () => void;
}

/**
 * Phễu `days` ngày gần nhất. Cũng là phép thử quyền của cả trang: `/v1/me` không nói ai là quản trị, mà đây là
 * lời gọi quản trị duy nhất chỉ đọc.
 */
export const useAdminFunnel = (days: number): FunnelState => {
  const [state, setState] = useState<Omit<FunnelState, 'reload'>>({ data: null, loading: true, denied: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchFunnel(days).then(
      (data) => !cancelled && setState({ data, loading: false, denied: null, error: null }),
      (err: unknown) => {
        if (cancelled) return;
        const denied = adminDeniedMessage(err);
        setState((s) => ({ ...s, loading: false, denied, error: denied ? null : adminErrorMessage(err) }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [days, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
};

export interface PaymentsState {
  readonly data: AdminPayments | null;
  readonly loading: boolean;
  readonly error: string | null;
}

/**
 * Giao dịch mua gói. `request = null`: chưa bấm xem — KHÔNG gọi, vì mỗi lần xem máy chủ ghi một dòng nhật ký quản
 * trị. Đưa một object mới (dù cùng số ngày) là xem lại.
 */
export const useAdminPayments = (request: { readonly days: number } | null): PaymentsState => {
  const [state, setState] = useState<PaymentsState>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchPayments(request.days).then(
      (data) => !cancelled && setState({ data, loading: false, error: null }),
      // API cũ chưa có route → 404 → câu "máy chủ chưa có chức năng", không phải "HTTP 404".
      (err: unknown) => !cancelled && setState({ data: null, loading: false, error: adminDeniedMessage(err) ?? adminErrorMessage(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [request]);

  return state;
};

export interface RequestState<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
}

/**
 * Một lời gọi quản trị chỉ đọc. `request = null`: chưa gọi. Đưa object mới (dù cùng giá trị) là gọi lại — các lời gọi
 * ghi nhật ký (tìm tổ chức, xem chi tiết, tìm người, xem phản hồi) chỉ đổi `request` khi người quản trị bấm.
 * `load` phải cố định (hàm cấp module), không thì mỗi lần vẽ lại là một lần gọi.
 */
export const useAdminRequest = <R, T>(request: R | null, load: (request: R) => Promise<T>): RequestState<T> => {
  const [state, setState] = useState<RequestState<T>>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (request === null) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    load(request).then(
      (data) => !cancelled && setState({ data, loading: false, error: null }),
      // API cũ chưa có route → 404 → câu "máy chủ chưa có chức năng", không phải "HTTP 404".
      (err: unknown) => !cancelled && setState({ data: null, loading: false, error: adminDeniedMessage(err) ?? adminErrorMessage(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [request, load]);

  return state;
};
