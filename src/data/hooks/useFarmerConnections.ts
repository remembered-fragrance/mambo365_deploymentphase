import { useCallback, useEffect, useRef, useState } from 'react';
import type { LinkedBalanceItem, LinkedReceipt, LinkSummary } from '@mambo/contracts';
import { api, hasBackend } from '../client';
import { useStore } from '../useStore';

type FarmerLink = Awaited<ReturnType<typeof api.links.list>>['links'][number];

export function useFarmerConnections() {
  const { currentOrgId, orgType, permissions, features } = useStore();
  const availability = farmerLinksAvailability(orgType, features, permissions);
  const enabled = availability === 'available';
  const [links, setLinks] = useState<readonly FarmerLink[]>([]);
  const [balances, setBalances] = useState<readonly LinkedBalanceItem[]>([]);
  const [receipts, setReceipts] = useState<readonly LinkedReceipt[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [linksLoading, setLinksLoading] = useState(false);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // List/balance refresh and receipt pagination are independent requests. A receipt
  // selection must not invalidate a successful link refresh (or leave its spinner set).
  const listSequence = useRef(0);
  const receiptSequence = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++listSequence.current;
    if (!enabled || !currentOrgId || !hasBackend()) {
      setLinks([]); setBalances([]); setReceipts([]); setSelectedOrgId(''); setCursor(null);
      if (enabled && currentOrgId && !hasBackend()) setError('Chưa kết nối được máy chủ API. Kiểm tra cấu hình rồi thử lại.');
      setLinksLoading(false);
      return;
    }
    setLinksLoading(true);
    setError(null);
    try {
      const [linkResult, balanceResult] = await Promise.all([api.links.list(), api.linked.balance()]);
      if (id !== listSequence.current) return;
      setLinks(linkResult.links);
      setBalances(balanceResult.items);
      const firstActive = linkResult.links.find((link) => link.side === 'linked' && link.status === 'active')?.counterpart?.id ?? '';
      setSelectedOrgId((current) => current && balanceResult.items.some((item) => item.organization.id === current) ? current : firstActive);
    } catch (cause) {
      if (id === listSequence.current) setError(farmerConnectionError(cause, 'Không tải được kết nối.'));
    } finally {
      if (id === listSequence.current) setLinksLoading(false);
    }
  }, [currentOrgId, enabled]);

  const loadReceipts = useCallback(async (orgId: string, next?: string, append = false) => {
    const id = ++receiptSequence.current;
    if (!orgId || !enabled || !hasBackend()) {
      setReceipts([]); setCursor(null); setReceiptsLoading(false);
      if (orgId && enabled && !hasBackend()) setError('Chưa kết nối được máy chủ API. Kiểm tra cấu hình rồi thử lại.');
      return;
    }
    if (append) setLoadingMore(true); else setReceiptsLoading(true);
    setError(null);
    try {
      const result = await api.linked.receipts({ orgId, limit: 20, ...(next ? { cursor: next } : {}) });
      if (id !== receiptSequence.current) return;
      setReceipts((previous) => append ? [...previous, ...result.receipts] : result.receipts);
      setCursor(result.cursor);
    } catch (cause) {
      if (id === receiptSequence.current) setError(farmerConnectionError(cause, 'Không tải được phiếu liên kết.'));
    } finally {
      if (id === receiptSequence.current) { setReceiptsLoading(false); setLoadingMore(false); }
    }
  }, [enabled]);

  useEffect(() => {
    const listRequests = listSequence;
    const receiptRequests = receiptSequence;
    setLinks([]); setBalances([]); setReceipts([]); setSelectedOrgId(''); setCursor(null); setError(null);
    void refresh();
    return () => { listRequests.current++; receiptRequests.current++; };
  }, [currentOrgId, refresh]);

  useEffect(() => {
    if (selectedOrgId) void loadReceipts(selectedOrgId);
    else {
      receiptSequence.current++;
      setReceipts([]);
      setCursor(null);
      setReceiptsLoading(false);
    }
  }, [loadReceipts, selectedOrgId]);

  const claim = useCallback(async (code: string): Promise<LinkSummary> => {
    setMutating(true); setError(null);
    try {
      const link = await api.links.claim({ code });
      await refresh();
      return link;
    } catch (cause) {
      setError(farmerConnectionError(cause, 'Không nhận được mã kết nối.'));
      throw cause;
    } finally { setMutating(false); }
  }, [refresh]);

  const revoke = useCallback(async (id: string) => {
    const target = links.find((link) => link.id === id);
    const permitted = target?.side === 'owner'
      ? permissions.includes('partner:manage')
      : target?.side === 'linked' && permissions.includes('linked:read');
    if (!enabled || !permitted) {
      const cause = new Error('Tài khoản hiện tại không có quyền huỷ kết nối này.');
      setError(cause.message);
      throw cause;
    }
    setMutating(true); setError(null);
    try { await api.links.revoke(id); await refresh(); }
    catch (cause) { setError(farmerConnectionError(cause, 'Không huỷ được kết nối.')); throw cause; }
    finally { setMutating(false); }
  }, [enabled, links, permissions, refresh]);

  const retry = useCallback(async () => {
    await Promise.all([refresh(), selectedOrgId ? loadReceipts(selectedOrgId) : Promise.resolve()]);
  }, [loadReceipts, refresh, selectedOrgId]);

  return {
    enabled, availability, links, balances, receipts, selectedOrgId, setSelectedOrgId, cursor,
    loading: linksLoading || receiptsLoading, loadingMore, mutating, error, refresh, retry, claim, revoke,
    loadMore: () => cursor ? loadReceipts(selectedOrgId, cursor, true) : Promise.resolve(),
  };
}

export type FarmerLinksAvailability = 'available' | 'wrong-org' | 'feature-off' | 'permission-missing';

export function farmerLinksAvailability(
  orgType: string | null,
  features: readonly string[],
  permissions: readonly string[],
): FarmerLinksAvailability {
  if (orgType !== 'farmer') return 'wrong-org';
  if (!features.includes('links')) return 'feature-off';
  if (!permissions.includes('linked:read')) return 'permission-missing';
  return 'available';
}

export function farmerConnectionError(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
