import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { L } from '@/i18n/labels';
import { EyeIcon, EyeOffIcon } from './icons';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly suffix?: ReactNode;
}

export function Input({ label, hint, error, suffix, type, className = '', ...rest }: InputProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  // Ô mật khẩu nào cũng có nút hiện/ẩn: gõ trên điện thoại hay sai mà không nhìn thấy.
  const toggle = type === 'password' && (
    <button
      type="button"
      onClick={() => setShown((s) => !s)}
      aria-label={L.showPassword}
      aria-pressed={shown}
      className="rounded-full p-2 text-ink-3"
    >
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
  const end = suffix ?? toggle;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={type === 'password' && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`input-base ${end ? 'pr-12' : ''} ${error ? 'border-alert' : ''} ${className}`}
          {...rest}
        />
        {end && <span className="absolute right-2 flex items-center">{end}</span>}
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
