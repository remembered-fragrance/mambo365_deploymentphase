import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/data/dataViewModel';
import { formatVnd, formatWeight } from '@/core/format';
import type { InventoryValueRow } from '@/core/inventory';
import { L } from '@/i18n/labels';

/**
 * Khai báo cột một lần cho cả bảng (máy tính) lẫn thẻ (điện thoại).
 *
 * Bản demo đổ bảng vào `overflow-x-auto` ở mọi bề rộng, tức là ở điện thoại
 * phải cuộn ngang mới thấy cột tồn — đúng cột người ta mở trang này để xem.
 */
export const inventoryColumns = (): Column<InventoryValueRow>[] => [
  {
    id: 'product',
    header: L.product,
    cell: (row) => row.productName,
    mobile: 'title',
  },
  {
    id: 'bought',
    header: L.boughtIn,
    cell: (row) => formatWeight(row.purchasedKg),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
    hideBelow: 'lg',
  },
  {
    id: 'sold',
    header: L.soldOut,
    cell: (row) => formatWeight(row.soldKg),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
    hideBelow: 'lg',
  },
  {
    id: 'avgCost',
    header: L.avgCost,
    cell: (row) => (row.avgCostPerKg > 0 ? formatVnd(row.avgCostPerKg) : '—'),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
    hideBelow: 'md',
  },
  {
    id: 'stockValue',
    header: L.stockValue,
    cell: (row) => (row.stockValue > 0 ? formatVnd(row.stockValue) : '—'),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
    hideBelow: 'md',
  },
  {
    id: 'stock',
    header: L.stockLeft,
    cell: (row) => (
      <span className={row.stockKg < 0 ? 'font-extrabold text-alert' : ''}>
        {formatWeight(row.stockKg)}
      </span>
    ),
    align: 'right',
    numeric: true,
    mobile: 'value',
  },
  {
    id: 'warning',
    header: '',
    // Tồn âm không bao giờ là chuyện bình thường: có chữ và dấu, không chỉ màu.
    cell: (row) =>
      row.stockKg < 0 ? <Badge tone="alert" mark="!" label={L.negativeStock} /> : null,
    mobile: 'badge',
  },
];
