import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly suffix?: ReactNode;
}

export function Input({ label, hint, error, suffix, className = '', ...rest }: InputProps) {
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
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`input-base ${suffix ? 'pr-12' : ''} ${error ? 'border-alert' : ''} ${className}`}
          {...rest}
        />
        {suffix && <span className="absolute right-2 flex items-center">{suffix}</span>}
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
