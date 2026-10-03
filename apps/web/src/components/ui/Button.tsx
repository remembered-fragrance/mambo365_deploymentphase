import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonTone = 'primary' | 'quiet' | 'danger';
export type ButtonSize = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: ButtonTone;
  readonly size?: ButtonSize;
  readonly block?: boolean;
  readonly children: ReactNode;
}

const TONE: Record<ButtonTone, string> = {
  primary: 'bg-brand text-paper border-brand active:brightness-90',
  quiet: 'bg-card text-ink border-rule active:bg-paper',
  danger: 'bg-card text-alert border-alert active:bg-paper',
};

const SIZE: Record<ButtonSize, string> = {
  md: 'min-h-[var(--density-row-h)] px-4 text-base',
  lg: 'min-h-[3.5rem] px-5 text-lg',
};

export function Button({
  tone = 'quiet',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition disabled:opacity-50 ${TONE[tone]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
