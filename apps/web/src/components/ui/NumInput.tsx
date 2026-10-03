import { useId, type ReactNode } from 'react';

/**
 * Ô nhập số. KHÔNG dùng `type="number"`:
 *  - lăn chuột trên máy tính đổi giá trị ngoài ý muốn,
 *  - mỗi trình duyệt hiểu dấu ngăn nghìn một kiểu.
 *
 * Component này không biết parse số (luật ranh giới: `components/` không import
 * `core/`). Nó nhận chuỗi thô người dùng đang gõ (`value`), chuỗi đã có ngăn
 * nghìn để hiển thị (`display`) và dòng đọc bằng chữ (`hint`) — tầng `features/`
 * tính ba thứ đó bằng `core/parseNumber` và `core/numberToWords`.
 */
interface NumInputProps {
  readonly label: string;
  readonly value: string;
  readonly display?: string;
  readonly hint?: string;
  readonly unit?: string;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly autoFocus?: boolean;
  readonly onValueChange: (raw: string) => void;
  readonly onOpenNumpad?: () => void;
  readonly trailing?: ReactNode;
}

export function NumInput({
  label,
  value,
  display,
  hint,
  unit,
  error,
  readOnly = false,
  autoFocus = false,
  onValueChange,
  onOpenNumpad,
  trailing,
}: NumInputProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          readOnly={readOnly}
          value={display ?? value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onFocus={onOpenNumpad}
          onChange={(e) => onValueChange(e.target.value)}
          className={`input-base num text-right text-lg font-semibold ${unit || trailing ? 'pr-14' : ''} ${error ? 'border-alert' : ''}`}
        />
        <span className="absolute right-3 flex items-center gap-1 text-sm text-ink-3">
          {unit}
          {trailing}
        </span>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
