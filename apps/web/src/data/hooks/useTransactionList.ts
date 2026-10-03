/**
 * Danh sách phiếu đã lọc, tải dần.
 *
 * Giai đoạn này lọc phía client trên bản sổ trong máy — dữ liệu pilot còn nhỏ.
 * Chữ ký hook thiết kế sẵn để sau đổi sang `.range()` phía máy chủ mà giao diện
 * không phải sửa một dòng nào.
 */

import { useCallback, useMemo, useState } from 'react';
import { filterTransactions, type HistoryFilters } from '@/core/filters';
import type { Transaction } from '@/core/types';
import { useStore } from '../useStore';

const PAGE_SIZE = 50;

export interface TransactionListResult {
  readonly rows: readonly Transaction[];
  readonly total: number;
  readonly loadMore: () => void;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
}

export function useTransactionList(filters: HistoryFilters): TransactionListResult {
  const { data } = useStore();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const matched = useMemo(
    () => filterTransactions(data.transactions, filters),
    [data.transactions, filters],
  );

  const loadMore = useCallback(() => setLimit((n) => n + PAGE_SIZE), []);

  return {
    rows: matched.slice(0, limit),
    total: matched.length,
    loadMore,
    // Lọc trong máy nên không có lúc nào phải chờ; giữ trường để sau đổi nguồn.
    isLoadingMore: false,
    hasMore: matched.length > limit,
  };
}
