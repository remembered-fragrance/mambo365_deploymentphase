import type { ReactNode } from 'react';
import { WarningIcon } from './icons';

interface ErrorStateProps {
  readonly title: string;
  readonly description: string;
  /** Chi tiết kỹ thuật — gập lại, người dùng thường không cần đọc. */
  readonly detail?: string;
  readonly actions?: ReactNode;
}

export function ErrorState({ title, description, detail, actions }: ErrorStateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <WarningIcon className="h-8 w-8 text-alert" />
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-2">{description}</p>
      {detail && (
        <details className="w-full text-left">
          <summary className="cursor-pointer text-sm text-ink-3">{detail.slice(0, 40)}…</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-paper p-2 text-xs text-ink-2">
            {detail}
          </pre>
        </details>
      )}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
