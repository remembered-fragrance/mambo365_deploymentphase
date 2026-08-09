import type { ReactNode } from 'react';

interface CardProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Card({ title, subtitle, action, className = '', children }: CardProps) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
