import type { ComponentType } from 'react';

/**
 * Mô tả điều hướng. Component chỉ nhận mô tả này qua props — nó không biết
 * route nào có thật, `features/` quyết định.
 */
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
  readonly Icon: ComponentType<{ readonly className?: string }>;
  /** Vị trí trên thanh dưới. 5 slot: 1 · 2 · [nút tạo phiếu] · 3 · 4. */
  readonly bar?: 1 | 2 | 3 | 4;
  readonly badge?: number;
  /** Màn hình chưa có ở bản này — vẫn giữ chỗ để bố cục không nhảy về sau. */
  readonly disabled?: boolean;
}

export interface NavGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavItem[];
}

export const barItem = (items: readonly NavItem[], slot: 1 | 2 | 3 | 4): NavItem | undefined =>
  items.find((item) => item.bar === slot);
