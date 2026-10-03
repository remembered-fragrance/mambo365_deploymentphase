import type { ReactNode } from 'react';

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: string;
  readonly action?: ReactNode;
}

export function EmptyState({ title, description, icon = '📄', action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span aria-hidden="true" className="text-4xl">
        {icon}
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="max-w-xs text-sm text-ink-2">{description}</p>}
      {action}
    </div>
  );
}
