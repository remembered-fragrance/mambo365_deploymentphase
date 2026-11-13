import { useEffect, useState } from 'react';

/**
 * Ngón tay chạm hay chuột: `pointer: coarse` HOẶC không rê được (`hover: none`). Máy cảm ứng có gắn thêm thiết bị
 * trỏ (bút, chuột ảo của emulator) báo `pointer: fine` nhưng vẫn không rê được — chỉ hỏi `coarse` thì máy đó mất bàn
 * phím số lớn. Máy tính dùng chuột rê được ⇒ vẫn là bàn phím thường.
 */
const TOUCH_QUERY ='(pointer: coarse), (hover: none)';

/**
 * Máy này dùng ngón tay hay dùng chuột.
 *
 * 🔴 Quyết định bằng kiểu con trỏ (`TOUCH_QUERY`), KHÔNG bằng bề rộng màn hình: máy tính
 * bảng cảm ứng rộng 1024px vẫn cần bàn phím số, còn cửa sổ trình duyệt thu hẹp
 * trên máy bàn thì không.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(TOUCH_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(TOUCH_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return coarse;
}
