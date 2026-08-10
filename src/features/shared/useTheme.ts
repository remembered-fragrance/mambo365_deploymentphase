/**
 * Ba chế độ xem: Trong nhà · Ngoài nắng · Ban đêm.
 *
 * Đổi ngay, không tải lại trang: chỉ đặt `data-theme` lên thẻ gốc, token màu
 * trong `index.css` tự đổi theo.
 */

import { useCallback, useEffect } from 'react';
import { useStore } from '@/data/useStore';

export type ThemeName = 'day' | 'sun' | 'night';

export const THEME_ORDER: readonly ThemeName[] = ['day', 'sun', 'night'];

/** `displayMode` đã có sẵn trong sổ; `night` là lựa chọn thứ ba, lưu cùng chỗ. */
const toTheme = (displayMode: string): ThemeName =>
  displayMode === 'outdoor' ? 'sun' : displayMode === 'night' ? 'night' : 'day';

const toDisplayMode = (theme: ThemeName): 'normal' | 'outdoor' | 'night' =>
  theme === 'sun' ? 'outdoor' : theme === 'night' ? 'night' : 'normal';

export interface Theme {
  readonly theme: ThemeName;
  /** Nút ☀ ở header: bấm là sang chế độ kế tiếp, không cần mở cài đặt. */
  readonly cycleTheme: () => void;
  /** Màn Tài khoản chọn thẳng một chế độ. */
  readonly setTheme: (theme: ThemeName) => void;
}

export function useTheme(): Theme {
  const { data, updateSettings } = useStore();
  const theme = toTheme(data.settings.displayMode);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback(
    (next: ThemeName) => updateSettings({ displayMode: toDisplayMode(next) }),
    [updateSettings],
  );

  const cycleTheme = useCallback(() => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? 'day';
    setTheme(next);
  }, [theme, setTheme]);

  return { theme, cycleTheme, setTheme };
}
