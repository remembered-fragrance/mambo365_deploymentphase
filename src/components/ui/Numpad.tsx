import { useEffect, type ReactNode } from 'react';
import { L } from '@/i18n/labels';
import { BackspaceIcon, KeyboardIcon } from './icons';

export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | ',' | 'del' | 'clear';

interface NumpadProps {
  readonly label: string;
  /** Số đang gõ, đã có dấu ngăn nghìn — `features/` định dạng bằng `core/format`. */
  readonly display: string;
  /** Đọc bằng chữ: "bảy mươi bốn triệu". Cách kiểm tra duy nhất người dùng tin. */
  readonly spoken?: string;
  readonly onKeyPress: (key: NumpadKey) => void;
  readonly onClose: () => void;
  readonly onNext?: () => void;
  readonly onSystemKeyboard?: () => void;
}

const ROWS: readonly (readonly NumpadKey[])[] = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['000', '0', ','],
];

const KEY_CLASS =
  'flex min-h-[3.5rem] items-center justify-center bg-card text-2xl font-semibold text-ink active:bg-paper';

export function Numpad({
  label,
  display,
  spoken,
  onKeyPress,
  onClose,
  onNext,
  onSystemKeyboard,
}: NumpadProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <div className="w-full max-w-sm rounded-t-3xl border-t border-rule bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="border-b border-rule px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-ink-3">{label}</span>
            <span className="num text-2xl font-extrabold text-ink">{display || '0'}</span>
          </div>
          {spoken && <p className="mt-1 text-right text-sm text-ink-3">{spoken}</p>}
        </div>

        <div className="grid grid-cols-4 gap-px bg-rule p-px">
          {ROWS.flatMap((row) =>
            row.map((key) => (
              <NumKey key={key} ariaLabel={key} onPress={() => onKeyPress(key)}>
                {key}
              </NumKey>
            )),
          )}

          <NumKey ariaLabel={L.del} onPress={() => onKeyPress('del')}>
            <BackspaceIcon />
          </NumKey>
          <NumKey ariaLabel={L.clearAll} onPress={() => onKeyPress('clear')} className="text-base">
            {L.clearAll}
          </NumKey>
          <NumKey
            ariaLabel={onNext ? L.next : L.close}
            onPress={onNext ?? onClose}
            className="col-span-2 bg-brand text-base font-bold text-paper active:brightness-90"
          >
            {onNext ? L.next : L.close}
          </NumKey>
        </div>

        {onSystemKeyboard && (
          <button
            type="button"
            onClick={onSystemKeyboard}
            className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-medium text-ink-3"
          >
            <KeyboardIcon className="h-4 w-4" />
            {L.systemKeyboard}
          </button>
        )}
      </div>
    </div>
  );
}

interface NumKeyProps {
  readonly ariaLabel: string;
  readonly onPress: () => void;
  readonly className?: string;
  readonly children: ReactNode;
}

function NumKey({ ariaLabel, onPress, className = '', children }: NumKeyProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      // pointerDown thay click: phản hồi nhanh hơn hẳn trên máy Android tầm trung
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={`${KEY_CLASS} ${className}`}
    >
      {children}
    </button>
  );
}
