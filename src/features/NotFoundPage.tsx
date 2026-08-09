import { L } from '@/i18n/labels';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center p-4">
      <EmptyState title={L.notFoundTitle} icon="🧭" />
    </main>
  );
}
