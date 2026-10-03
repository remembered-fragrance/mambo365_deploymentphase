import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/data/dataViewModel';
import { PencilIcon, PhoneIcon } from '@/components/ui/icons';
import { formatDate, formatVnd } from '@/core/format';
import type { PartySummary, PartyRole } from '@/core/partySelectors';
import { L } from '@/i18n/labels';

/**
 * Số điện thoại là LIÊN KẾT `tel:`, không phải chữ.
 *
 * Việc chủ vựa làm nhiều nhất sau khi mở danh bạ là gọi điện (§16.6). Bấm số
 * mà không gọi được thì danh bạ chỉ là một cái bảng để nhìn.
 */
function PhoneLink({ phone, name }: { readonly phone: string; readonly name: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s/g, '')}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={`${L.callPhone} ${name}`}
      className="num inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand"
    >
      <PhoneIcon className="h-4 w-4" />
      {phone}
    </a>
  );
}

/**
 * Không dùng `onRowClick` cho danh sách này: thẻ ở mobile khi đó là một cái
 * nút to, mà bên trong lại có liên kết gọi điện và nút Sửa — nút lồng trong
 * nút vừa sai HTML vừa làm trình đọc màn hình đọc sai. Thay vào đó mỗi thứ
 * bấm được là một thứ riêng: tên mở chi tiết, số điện thoại gọi, bút chì sửa.
 */
export const partnerColumns = (
  role: PartyRole,
  onOpen: (party: PartySummary) => void,
  onEdit: (party: PartySummary) => void,
): Column<PartySummary>[] => [
  {
    id: 'name',
    header: L.partyName,
    cell: (p) => (
      <button type="button" onClick={() => onOpen(p)} className="text-left font-bold text-ink underline decoration-rule underline-offset-4">
        {p.name}
      </button>
    ),
    mobile: 'title',
    sortValue: (p) => p.name,
  },
  {
    id: 'phone',
    header: L.partyPhone,
    cell: (p) => (p.phone ? <PhoneLink phone={p.phone} name={p.name} /> : '—'),
    mobile: 'badge',
  },
  {
    id: 'area',
    header: L.partyArea,
    cell: (p) => p.location ?? '—',
    mobile: 'secondary',
    hideBelow: 'lg',
    sortValue: (p) => p.location ?? '',
  },
  {
    id: 'count',
    header: L.colReceiptCount,
    cell: (p) => `${p.txCount} ${L.receiptCountUnit}`,
    align: 'right',
    numeric: true,
    mobile: 'secondary',
    hideBelow: 'md',
    sortValue: (p) => p.txCount,
  },
  {
    id: 'total',
    header: L.colTotalMoney,
    cell: (p) => formatVnd(p.total),
    align: 'right',
    numeric: true,
    mobile: 'value',
    sortValue: (p) => p.total,
  },
  {
    id: 'debt',
    header: role === 'supplier' ? L.remainingDebt : L.remainingReceivable,
    cell: (p) =>
      p.debt > 0 ? (
        <Badge tone={role === 'supplier' ? 'payable' : 'receivable'} mark="!" label={formatVnd(p.debt)} />
      ) : (
        '—'
      ),
    align: 'right',
    mobile: 'badge',
    sortValue: (p) => p.debt,
  },
  {
    id: 'last',
    header: L.colLastDate,
    cell: (p) => (p.lastDate ? formatDate(p.lastDate) : '—'),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
    hideBelow: 'xl',
    sortValue: (p) => p.lastDate ?? '',
  },
  {
    id: 'edit',
    header: '',
    cell: (p) =>
      p.hasProfile ? (
        <button
          type="button"
          aria-label={`${L.editParty} ${p.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(p);
          }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-rule text-ink-2"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      ) : null,
    align: 'right',
    mobile: 'badge',
  },
];
