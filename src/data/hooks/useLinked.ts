/**
 * Kết nối và phần sổ bên kia cho mình xem — cửa cho màn hình (features/ chỉ chạm data/ qua hooks).
 *
 * Hỏi lại khi đổi tổ chức. Không giữ bản nhớ trong máy: đây là dữ liệu của bên kia, cần mạng.
 */

import { useCallback, useEffect, useState } from 'react';
import type { LinkedBalanceItem, LinkedReceipt, LinkSummary } from '@mambo/contracts';
import { linkedBalance, linkedReceipts, linkErrorMessage, listLinks } from '../links';
import { useStore } from '../useStore';

export { claimErrorMessage, claimLinkCode, formatLinkCode, inviteLink, linkErrorMessage, revokeLink } from '../links';

export interface Loaded<T> {
  readonly data: T | null;
  readonly error: string | null;
  readonly loading: boolean;
  readonly reload: () => void;
}

export function useLoad<T>(load: (() => Promise<T>) | null, key: string): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: load !== null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    load().then(
      (data) => !cancelled && setState({ data, error: null, loading: false }),
      (err: unknown) => !cancelled && setState((s) => ({ ...s, error: linkErrorMessage(err), loading: false })),
    );
    return () => {
      cancelled = true;
    };
    // `load` đổi danh tính mỗi lần vẽ; `key` mới là thứ quyết định hỏi lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Mỗi tổ chức đang kết nối (phía mình được xem) một dòng: họ nợ mình / mình nợ họ. */
export const useLinkedBalance = (): Loaded<readonly LinkedBalanceItem[]> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId ? linkedBalance : null, currentOrgId ?? '');
};

/** Mọi kết nối của tổ chức đang làm việc, cả hai phía. `enabled` = có quyền xem (người cân của vựa không có → 403). */
export const useLinks = (enabled = true): Loaded<readonly LinkSummary[]> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId && enabled ? listLinks : null, currentOrgId ?? '');
};

export interface LinkedReceiptPages {
  readonly receipts: readonly LinkedReceipt[];
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly loadMore: () => void;
}

/** Phiếu bên giữ sổ `orgId` ghi về mình, mới nhất trước, từng trang theo cursor của máy chủ. */
export function useLinkedReceipts(orgId: string): LinkedReceiptPages {
  const { currentOrgId } = useStore();
  const [receipts, setReceipts] = useState<readonly LinkedReceipt[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (from: string | null, reset: boolean) => {
      if (!currentOrgId) return;
      setLoading(true);
      setError(null);
      try {
        const page = await linkedReceipts(orgId, from ?? undefined);
        setReceipts((prev) => (reset ? page.receipts : [...prev, ...page.receipts]));
        setCursor(page.cursor);
        setHasMore(page.cursor !== null);
      } catch (err) {
        setError(linkErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [orgId, currentOrgId],
  );

  useEffect(() => {
    void fetchPage(null, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) void fetchPage(cursor, false);
  }, [cursor, fetchPage, hasMore, loading]);

  return { receipts, hasMore, loading, error, loadMore };
}
