import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { L } from '@/i18n/labels';

/** Khung của các trang mở từ link trong thư — ngoài cổng đăng nhập, ngoài khung app. */
export function PublicCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-8">
      <div className="card w-full p-5">
        <p className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <Logo />
          {L.appName}
        </p>
        <h1 className="mt-1 text-lg font-bold text-ink">{title}</h1>
        <div className="mt-4 flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}
