import { DataView } from '@/components/data/DataView';
import type { Column } from '@/components/data/dataViewModel';
import { formatDate, formatQuantity, formatVnd } from '@/core/format';
import type { ReceiptImport, SupplierImport } from '@/core/sheetImport';
import { L } from '@/i18n/labels';

/** Xem trước bấy nhiêu dòng đầu — đủ để nhận ra file lệch cột, không phải để đọc hết. */
const PREVIEW_ROWS = 10;

interface Props {
  readonly parsed:
    | { readonly kind: 'suppliers'; readonly rows: readonly SupplierImport[] }
    | { readonly kind: 'receipts'; readonly rows: readonly ReceiptImport[] };
}

const SUPPLIER_COLUMNS: readonly Column<SupplierImport>[] = [
  { id: 'name', header: L.partyName, cell: (r) => r.name, mobile: 'title' },
  { id: 'phone', header: L.partyPhone, cell: (r) => r.phone ?? '—', mobile: 'secondary' },
  { id: 'location', header: L.partyArea, cell: (r) => r.location ?? '—', hideBelow: 'md' },
];

const RECEIPT_COLUMNS: readonly Column<ReceiptImport>[] = [
  { id: 'date', header: L.colDate, cell: (r) => formatDate(r.date), mobile: 'secondary' },
  { id: 'party', header: L.colParty, cell: (r) => r.partyName, mobile: 'title' },
  { id: 'product', header: L.colProduct, cell: (r) => r.productName, hideBelow: 'md' },
  {
    id: 'quantity',
    header: L.grossWeight,
    cell: (r) => formatQuantity(r.grossWeight, r.unit),
    align: 'right',
    numeric: true,
  },
  {
    id: 'price',
    header: L.pricePerUnit,
    cell: (r) => formatVnd(r.pricePerUnit),
    align: 'right',
    numeric: true,
    mobile: 'value',
  },
];

/**
 * Mười dòng đầu, đúng cách app sẽ hiểu chúng.
 *
 * Cố ý hiện dữ liệu ĐÃ ĐỌC XONG chứ không phải nội dung ô thô: file lệch cột
 * lộ ra ngay ở đây (ngày nhảy sang cột tên, giá thành số lượng), còn nhìn lại
 * bảng thô thì chỉ thấy đúng cái file mình vừa mở.
 */
export function ImportPreview({ parsed }: Props) {
  if (parsed.kind === 'suppliers') {
    return (
      <DataView
        rows={parsed.rows.slice(0, PREVIEW_ROWS)}
        columns={SUPPLIER_COLUMNS}
        getKey={(row) => row.name}
        caption={L.importPreviewTitle}
      />
    );
  }

  return (
    <DataView
      rows={parsed.rows.slice(0, PREVIEW_ROWS)}
      columns={RECEIPT_COLUMNS}
      getKey={(row) => `${row.date}-${row.partyName}-${row.productName}`}
      caption={L.importPreviewTitle}
    />
  );
}
