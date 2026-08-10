import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { formatDate, formatVnd } from '@/core/format';
import { searchBook, type SearchHit } from '@/core/search';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

const GROUP_LABEL: Record<SearchHit['kind'], string> = {
  supplier: L.searchGroupParty,
  buyer: L.searchGroupParty,
  product: L.searchGroupProduct,
  transaction: L.searchGroupReceipt,
};

const routeOf = (hit: SearchHit): string => {
  if (hit.kind === 'transaction') return ROUTES.receiptDetail(hit.id);
  if (hit.kind === 'supplier') return `${ROUTES.suppliers}?doi-tac=${hit.id}`;
  if (hit.kind === 'buyer') return `${ROUTES.buyers}?doi-tac=${hit.id}`;
  return ROUTES.products;
};

/**
 * Tìm nhanh — dòng #15 của ma trận parity, chức năng duy nhất hoàn toàn mới.
 *
 * Ở máy tính mở bằng Ctrl/⌘ K, ở điện thoại bằng nút kính lúp trên header.
 * Kết quả xếp theo mức hữu ích chứ không theo điểm khớp: đối tác và mặt hàng
 * trước, phiếu sau.
 */
export function CommandPalette({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const { data } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const hits = searchBook(data, query);

  const go = (hit: SearchHit) => {
    setQuery('');
    onClose();
    navigate(routeOf(hit));
  };

  return (
    <Dialog open={open} title={L.searchTitle} onClose={onClose}>
      <Input
        label={L.searchHint}
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim().length < 2 ? (
        <p className="mt-3 text-sm text-ink-3">{L.searchTypeMore}</p>
      ) : hits.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">{L.searchEmpty}</p>
      ) : (
        <ul className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <button
                type="button"
                onClick={() => go(hit)}
                className="flex w-full items-center gap-3 rounded-lg border border-rule bg-card px-3 py-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{hit.title}</span>
                  <span className="num block truncate text-sm text-ink-3">
                    {GROUP_LABEL[hit.kind]}
                    {hit.detail ? ` · ${hit.detail}` : ''}
                    {hit.date ? ` · ${formatDate(hit.date)}` : ''}
                  </span>
                </span>
                {hit.amount !== undefined && (
                  <span className="num shrink-0 font-bold text-ink">{formatVnd(hit.amount)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
