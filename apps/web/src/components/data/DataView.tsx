import type { ReactNode } from 'react';
import { ChevronRightIcon } from '@/components/ui/icons';
import {
  HIDE_BELOW,
  pickColumn,
  pickColumns,
  sortRows,
  type Column,
  type SortState,
} from './dataViewModel';

interface DataViewProps<TRow> {
  readonly rows: readonly TRow[];
  readonly columns: readonly Column<TRow>[];
  readonly getKey: (row: TRow) => string;
  readonly caption: string;
  readonly onRowClick?: (row: TRow) => void;
  readonly selectedKey?: string;
  readonly empty?: ReactNode;
  /** Có cả `sort` lẫn `onSortChange` thì tiêu đề cột bấm được để đổi thứ tự. */
  readonly sort?: SortState;
  readonly onSortChange?: (sort: SortState) => void;
}

const ARIA_SORT = (active: boolean, desc: boolean): 'ascending' | 'descending' | 'none' =>
  active ? (desc ? 'descending' : 'ascending') : 'none';

/**
 * Khai báo cột MỘT lần, hai hình thái: bảng ở ≥md, thẻ ở <md.
 *
 * Đây là câu trả lời cho "máy tính xem tốt, điện thoại cũng tốt" mà không phải
 * viết hai lần. Điện thoại KHÔNG BAO GIỜ cuộn ngang bảng — đó là cách xem bảng
 * tệ nhất trên màn hẹp, và người dùng của app này cầm điện thoại bằng một tay.
 */
export function DataView<TRow>({
  rows,
  columns,
  getKey,
  caption,
  onRowClick,
  selectedKey,
  empty,
  sort,
  onSortChange,
}: DataViewProps<TRow>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  const ordered = sortRows(rows, columns, sort);

  return (
    <>
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-ink-3">
            {columns.map((col) => {
              const sortable = col.sortValue !== undefined && onSortChange !== undefined;
              const active = sort?.columnId === col.id;
              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={sortable ? ARIA_SORT(active, sort?.desc ?? false) : undefined}
                  className={`px-3 py-2 font-bold ${col.align === 'right' ? 'text-right' : ''} ${
                    col.hideBelow ? HIDE_BELOW[col.hideBelow] : ''
                  }`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange({ columnId: col.id, desc: active ? !sort?.desc : true })}
                      className={`min-h-8 uppercase ${active ? 'text-brand' : ''}`}
                    >
                      {col.header}
                      <span aria-hidden="true">{active ? (sort?.desc ? ' ↓' : ' ↑') : ''}</span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => {
            const key = getKey(row);
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                aria-selected={selectedKey === key || undefined}
                className={`border-b border-rule ${onRowClick ? 'cursor-pointer' : ''} ${
                  selectedKey === key ? 'bg-card' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={`px-3 py-3 align-top ${col.align === 'right' ? 'text-right' : ''} ${
                      col.numeric ? 'num' : ''
                    } ${col.hideBelow ? HIDE_BELOW[col.hideBelow] : ''}`}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="flex flex-col gap-2 md:hidden">
        {ordered.map((row) => (
          <li key={getKey(row)}>
            <RowCard row={row} columns={columns} caption={caption} onRowClick={onRowClick} />
          </li>
        ))}
      </ul>
    </>
  );
}

function RowCard<TRow>({
  row,
  columns,
  caption,
  onRowClick,
}: {
  readonly row: TRow;
  readonly columns: readonly Column<TRow>[];
  readonly caption: string;
  readonly onRowClick?: (row: TRow) => void;
}) {
  const title = pickColumn(columns, 'title');
  const value = pickColumn(columns, 'value');
  const secondary = pickColumns(columns, 'secondary');
  const badges = pickColumns(columns, 'badge');

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{title?.cell(row)}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-3">
            {secondary.map((col) => (
              <span key={col.id} className={col.numeric ? 'num' : ''}>
                {col.cell(row)}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="num font-extrabold text-ink">{value?.cell(row)}</p>
        </div>
      </div>
      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {badges.map((col) => (
            <span key={col.id}>{col.cell(row)}</span>
          ))}
        </div>
      )}
    </>
  );

  if (!onRowClick) return <div className="card p-3">{body}</div>;

  return (
    <button
      type="button"
      onClick={() => onRowClick(row)}
      aria-label={caption}
      className="card flex w-full items-center gap-2 p-3 text-left"
    >
      <span className="min-w-0 flex-1">{body}</span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-3" />
    </button>
  );
}
