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
}

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
