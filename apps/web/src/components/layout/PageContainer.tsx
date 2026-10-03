import type { ReactNode } from 'react';

export type PageWidth = 'form' | 'content' | 'wide' | 'full';

const WIDTH: Record<PageWidth, string> = {
  form: 'max-w-3xl',
  content: 'max-w-5xl',
  wide: 'max-w-[1600px]',
  full: 'max-w-none',
};

/**
 * Bốn mức bề rộng cho toàn app. Trang KHÔNG tự đặt `max-w-*` nữa — nếu mỗi
 * trang tự quyết thì sau vài tháng có sáu bề rộng khác nhau và không ai nhớ vì sao.
 */
export function PageContainer({
  width = 'content',
  children,
}: {
  readonly width?: PageWidth;
  readonly children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full px-4 pb-28 pt-4 lg:px-6 lg:pb-10 ${WIDTH[width]}`}>
      {children}
    </div>
  );
}
