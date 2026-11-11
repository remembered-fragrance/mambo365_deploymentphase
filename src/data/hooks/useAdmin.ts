/**
 * Trang quản trị `/quan-tri` — cửa cho màn hình (features/ chỉ chạm data/ qua hooks).
 */

import { useCallback, useEffect, useState } from 'react';
import type { AdminFunnel } from '@mambo/contracts';
import { adminDeniedMessage, adminErrorMessage, fetchFunnel } from '../admin';

export { activateInput, activatePlan, adminErrorMessage, ownedOrganizations, resetInput, resetPassword } from '../admin';
export type { ActivateDraft, ResetDraft } from '../admin';

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
