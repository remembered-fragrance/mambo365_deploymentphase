import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { L } from '@/i18n/labels';
import { CloseIcon } from './icons';

interface BottomSheetProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/** Bảng trượt từ dưới lên — ngón cái với tới được, dùng cho menu và tóm tắt. */
export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="no-print fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label={L.close}
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-ink/40"
      />
      <div className="sheet-panel absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-rule bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-rule" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={L.close}
            className="rounded-full p-1.5 text-ink-3"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="px-4 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
