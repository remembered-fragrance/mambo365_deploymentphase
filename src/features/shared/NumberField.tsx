import { useState } from 'react';
import { NumInput } from '@/components/ui/NumInput';
import { Numpad } from '@/components/ui/Numpad';
import { appendDigit, parseNumber } from '@/core/parseNumber';
import { groupThousands } from '@/core/format';
import { moneyToVietnameseWords } from '@/core/numberToWords';
import { L } from '@/i18n/labels';
import { useCoarsePointer } from './useCoarsePointer';

interface NumberFieldProps {
  readonly label: string;
  /** Chuỗi thô người dùng đang gõ, ví dụ `74000000` hoặc `1,5`. */
  readonly value: string;
  readonly onValueChange: (raw: string) => void;
  readonly unit?: string;
  readonly error?: string;
  readonly autoFocus?: boolean;
  /** Hiện dòng đọc bằng chữ — bật cho ô tiền, tắt cho ô cân. */
  readonly spoken?: boolean;
  readonly onNext?: () => void;
}

/**
 * Ô nhập số của toàn app.
 *
 * `components/` không được import `core/`, nên `<NumInput>` và `<Numpad>` cố ý
 * không biết parse số. Component này là nơi ghép chúng với `core/parseNumber`
 * và `core/numberToWords`.
 *
 * Trên thiết bị cảm ứng, chạm ô mở BÀN PHÍM SỐ chứ không phải bàn phím hệ
 * thống — phím 56px là lợi thế lớn nhất của app với tệp người dùng này. Quyết
 * định bằng `pointer: coarse`, không bằng bề rộng màn hình.
 */
export function NumberField({
  label,
  value,
  onValueChange,
  unit,
  error,
  autoFocus,
  spoken = false,
  onNext,
}: NumberFieldProps) {
  const coarse = useCoarsePointer();
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [systemKeyboard, setSystemKeyboard] = useState(false);

  const useNumpad = coarse && !systemKeyboard;
  const display = groupThousands(value);
  const words = spoken && value ? moneyToVietnameseWords(parseNumber(value)) : undefined;

  return (
    <>
      <NumInput
        label={label}
        value={value}
        display={display}
        hint={words}
        unit={unit}
        error={error}
        autoFocus={autoFocus}
        readOnly={useNumpad}
        onValueChange={(next) => onValueChange(next.replace(/\./g, '').replace(/[^\d,]/g, ''))}
        onOpenNumpad={useNumpad ? () => setNumpadOpen(true) : undefined}
      />

      {useNumpad && numpadOpen && (
        <Numpad
          label={label}
          display={display}
          spoken={words}
          onKeyPress={(key) => onValueChange(appendDigit(value, key))}
          onClose={() => setNumpadOpen(false)}
          onNext={
            onNext &&
            (() => {
              setNumpadOpen(false);
              onNext();
            })
          }
          onSystemKeyboard={() => {
            setSystemKeyboard(true);
            setNumpadOpen(false);
          }}
        />
      )}

      {systemKeyboard && (
        <button
          type="button"
          onClick={() => setSystemKeyboard(false)}
          className="self-start text-sm font-semibold text-brand"
        >
          {L.enterNumber}
        </button>
      )}
    </>
  );
}
