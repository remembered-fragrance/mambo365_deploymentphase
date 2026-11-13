/**
 * Bật / tắt chế độ trình diễn.
 *
 * Nạp sổ mẫu đi qua `importData` như mọi lần nhập file khác — không có đường
 * riêng nào ghi thẳng vào lưu trữ. Nhờ vậy "Xoá hết, bắt đầu thật" chỉ là
 * `reset()`, và không có dữ liệu mẫu nào sống sót ở góc nào đó.
 *
 * Cờ dùng `useSyncExternalStore` để banner ở khung app và nút ở màn hình chào
 * luôn nói cùng một điều, dù hai chỗ đó nằm cách nhau cả cây component.
 */

import { useSyncExternalStore } from 'react';
import { demoBook } from '@mambo/core/demoSeed';
import { isDemoActive, setDemoActive, subscribeDemo } from '../demoMode';
import { useStore } from '../useStore';

export interface DemoMode {
  readonly demo: boolean;
  readonly startDemo: () => void;
  readonly endDemo: () => void;
}

export function useDemoMode(): DemoMode {
  const { importData, reset, bookKey } = useStore();
  const demo = useSyncExternalStore(subscribeDemo, () => isDemoActive(bookKey), () => false);

  return {
    demo,
    startDemo: () => {
      if (!bookKey) return;
      // Bật cờ TRƯỚC khi nạp: store chốt cờ lúc ghi để biết thao tác có được gửi lên máy chủ không.
      setDemoActive(bookKey, true);
      importData(demoBook());
    },
    endDemo: () => {
      reset();
      if (bookKey) setDemoActive(bookKey, false);
    },
  };
}
