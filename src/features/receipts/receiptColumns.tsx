import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/data/dataViewModel';
import { transactionTotals } from '@/core/calc';
import { formatDate, formatVnd } from '@/core/format';
import type { Transaction } from '@/core/types';
import { L } from '@/i18n/labels';

/** Mua/bán phải phân biệt được cả khi in đen trắng: có chữ và ký hiệu, không chỉ màu. */
export const kindBadge = (tx: Transaction) =>
  tx.kind === 'sale' ? (
    <Badge tone="out" mark="↑" label={L.sale} />
  ) : (
    <Badge tone="in" mark="↓" label={L.purchase} />
  );

export const receiptColumns = (): Column<Transaction>[] => [
  {
    id: 'date',
    header: L.colDate,
    cell: (tx) => formatDate(tx.date),
    mobile: 'secondary',
    numeric: true,
  },
  {
    id: 'kind',
    header: L.colKind,
    cell: kindBadge,
    mobile: 'badge',
  },
  {
    id: 'party',
    header: L.colParty,
    cell: (tx) => tx.supplierName,
    mobile: 'title',
  },
  {
    id: 'products',
    header: L.colProduct,
    cell: (tx) => [...new Set(tx.lines.map((l) => l.productName))].join(', '),
    mobile: 'secondary',
    hideBelow: 'lg',
  },
  {
    id: 'total',
    header: L.total,
    cell: (tx) => formatVnd(transactionTotals(tx).total),
    align: 'right',
    mobile: 'value',
    numeric: true,
  },
  {
    id: 'debt',
    header: L.remainingDebt,
    cell: (tx) => {
      const { debt } = transactionTotals(tx);
      return debt > 0 ? (
        <Badge tone="payable" mark="!" label={formatVnd(debt)} />
      ) : (
        <Badge tone="neutral" mark="✓" label={L.paidInFull} />
      );
    },
    align: 'right',
    mobile: 'badge',
    hideBelow: 'lg',
  },
];
