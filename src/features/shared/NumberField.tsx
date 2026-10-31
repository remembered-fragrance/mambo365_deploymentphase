import { useState } from 'react';
import { NumInput } from '@/components/ui/NumInput';
import { Numpad } from '@/components/ui/Numpad';
import { appendDigit, parseNumber } from '@mambo/core/parseNumber';
import { formatVnd, groupThousands } from '@mambo/core/format';
import { moneyToVietnameseWords } from '@mambo/core/numberToWords';
import { L } from '@/i18n/labels';
import { isRoundedMoney, parseMoney } from './money';
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
  /** Ô tiền: gõ lẻ vẫn được nhưng số lưu là đồng nguyên — báo trước số sẽ lưu. Xem `money.ts`. */
  readonly money?: boolean;
  /** Lớn nhất máy chủ nhận (`RECEIPT_LIMITS`). Phím làm số vượt mức thì không ăn — lọt lên là kẹt hàng đợi. */
  readonly max?: number;
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
 * định bằng kiểu con trỏ (`useCoarsePointer`), không bằng bề rộng màn hình.
 */
export function NumberField({
  label,
  value,
  onValueChange,
  unit,
  error,
  autoFocus,
  spoken = false,
  money = false,
  max,
  onNext,
}: NumberFieldProps) {
  const coarse = useCoarsePointer();
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [systemKeyboard, setSystemKeyboard] = useState(false);

  const useNumpad = coarse && !systemKeyboard;
  const display = groupThousands(value);
  const words = spoken && value ? moneyToVietnameseWords(parseNumber(value)) : undefined;
  const rounded = money && isRoundedMoney(value) ? `${L.moneyRoundedTo} ${formatVnd(parseMoney(value))}` : undefined;
  const hint = [rounded, words].filter(Boolean).join(' · ') || undefined;
  const change = (next: string) => {
    if (max === undefined || parseNumber(next) <= max) onValueChange(next);
  };

  return (
    <>
      <NumInput
        label={label}
        value={value}
        display={display}
        hint={hint}
        unit={unit}
        error={error}
        autoFocus={autoFocus}
        readOnly={useNumpad}
        onValueChange={(next) => change(next.replace(/\./g, '').replace(/[^\d,]/g, ''))}
        onOpenNumpad={useNumpad ? () => setNumpadOpen(true) : undefined}
      />

      {useNumpad && numpadOpen && (
        <Numpad
          label={label}
          display={display}
          spoken={hint}
          onKeyPress={(key) => change(appendDigit(value, key))}
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
