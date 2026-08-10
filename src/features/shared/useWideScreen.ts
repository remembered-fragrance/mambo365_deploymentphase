import { useEffect, useState } from 'react';

/**
 * Màn hình có đủ rộng cho bố cục hai pane không (≥1024px).
 *
 * Cần hỏi bằng JavaScript chứ không chỉ bằng CSS vì bảng trượt từ dưới lên
 * dựng qua portal ra thẳng `body` — bọc nó trong `lg:hidden` không giấu được,
 * phải quyết định có dựng nó hay không ngay từ đầu.
 */
const QUERY = '(min-width: 1024px)';

export function useWideScreen(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return wide;
}
