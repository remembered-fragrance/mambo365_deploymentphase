import { useEffect, useState } from 'react';

/**
 * Máy này dùng ngón tay hay dùng chuột.
 *
 * 🔴 Quyết định bằng `pointer: coarse`, KHÔNG bằng bề rộng màn hình: máy tính
 * bảng cảm ứng rộng 1024px vẫn cần bàn phím số, còn cửa sổ trình duyệt thu hẹp
 * trên máy bàn thì không.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return coarse;
}
