import type { ReactNode } from 'react';

export type ColumnAlign = 'left' | 'right';

/** Vai trò của cột khi màn hẹp — quyết định nó nằm đâu trên thẻ. */
export type MobileRole = 'title' | 'secondary' | 'value' | 'badge' | 'hidden';

export interface Column<TRow> {
  readonly id: string;
  readonly header: string;
  readonly cell: (row: TRow) => ReactNode;
  readonly align?: ColumnAlign;
  readonly mobile?: MobileRole;
  /** Ẩn cột ở màn hẹp hơn ngưỡng này (dạng bảng). */
  readonly hideBelow?: 'md' | 'lg' | 'xl';
  /** Cột số — dùng chữ số đều chiều rộng để đối soát theo cột. */
  readonly numeric?: boolean;
  /**
   * Có hàm này thì cột sắp xếp được. Trả về SỐ hoặc CHỮ để so, không trả về
   * chuỗi đã định dạng — "1.200.000₫" mà so bằng chữ thì đứng trước "900.000₫".
   */
  readonly sortValue?: (row: TRow) => number | string;
}

export interface SortState {
  readonly columnId: string;
  readonly desc: boolean;
}

/** Sắp xếp theo cột đang chọn. Cột không khai `sortValue` thì giữ nguyên thứ tự. */
export const sortRows = <TRow>(
  rows: readonly TRow[],
  columns: readonly Column<TRow>[],
  sort?: SortState,
): readonly TRow[] => {
  const value = sort && columns.find((c) => c.id === sort.columnId)?.sortValue;
  if (!sort || !value) return rows;

  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    const cmp =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'vi');
    return sort.desc ? -cmp : cmp;
  });
};

export const HIDE_BELOW: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export const pickColumn = <TRow>(
  columns: readonly Column<TRow>[],
  role: MobileRole,
): Column<TRow> | undefined => columns.find((c) => c.mobile === role);

export const pickColumns = <TRow>(
  columns: readonly Column<TRow>[],
  role: MobileRole,
): Column<TRow>[] => columns.filter((c) => c.mobile === role);
