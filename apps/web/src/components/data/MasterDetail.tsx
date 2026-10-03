import type { ReactNode } from 'react';
import { L } from '@/i18n/labels';
import { CloseIcon } from '@/components/ui/icons';

interface MasterDetailProps {
  readonly list: ReactNode;
  readonly detail?: ReactNode;
  readonly detailTitle: string;
  readonly onCloseDetail: () => void;
}

/**
 * ≥1440px: hai pane cạnh nhau.
 * 1024–1439px: chi tiết trượt từ phải vào.
 * <1024px: `features/` điều hướng sang trang riêng, component này chỉ hiện danh sách.
 *
 * URL vẫn đổi ở cả ba mức để gửi link cho người khác được.
 */
export function MasterDetail({ list, detail, detailTitle, onCloseDetail }: MasterDetailProps) {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">{list}</div>

      {detail && (
        <>
          <aside className="hidden w-[26rem] shrink-0 min-[1440px]:block">
            <div className="sticky top-20">{detail}</div>
          </aside>

          <div className="hidden lg:block min-[1440px]:hidden">
            <div className="fixed inset-0 z-30">
              <button
                type="button"
                aria-label={L.close}
                onClick={onCloseDetail}
                className="absolute inset-0 bg-ink/30"
              />
              <div className="absolute inset-y-0 right-0 w-[28rem] max-w-full overflow-y-auto border-l border-rule bg-paper p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink">{detailTitle}</h2>
                  <button
                    type="button"
                    onClick={onCloseDetail}
                    aria-label={L.close}
                    className="rounded-full p-1.5 text-ink-3"
                  >
                    <CloseIcon />
                  </button>
                </div>
                {detail}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
