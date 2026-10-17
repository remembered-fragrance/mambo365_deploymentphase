import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { confirmRecoveryEmail } from '@/data/hooks/useRecovery';
import { L } from '@/i18n/labels';
import { ROUTES } from '@/features/shared/navItems';
import { PublicCard } from './PublicCard';

/** Mã dùng một lần — StrictMode chạy effect hai lần thì lần sau dùng chung kết quả. */
const confirming = new Map<string, Promise<string | null>>();

type Result =
  | { readonly kind: 'checking' }
  | { readonly kind: 'done'; readonly email: string }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'error'; readonly message: string };

/**
 * `/xac-nhan-email?token=…` — mở từ thư xác nhận email khôi phục (BE 0.16.0). Không cần đăng nhập:
 * thư hay được mở trên máy khác máy đang dùng sổ.
 */
export function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token') ?? '');
  const [result, setResult] = useState<Result>(() => (token ? { kind: 'checking' } : { kind: 'invalid' }));

  useEffect(() => {
    if (!token) return;
    let pending = confirming.get(token);
    if (!pending) {
      pending = confirmRecoveryEmail(token);
      confirming.set(token, pending);
    }
    pending
      .then((email) => setResult(email ? { kind: 'done', email } : { kind: 'invalid' }))
      .catch((e: unknown) => {
        // Lỗi mạng / máy chủ: mã chưa dùng ⇒ mở lại link là thử lại được.
        confirming.delete(token);
        setResult({ kind: 'error', message: e instanceof Error ? e.message : L.recoveryFailed });
      });
  }, [token]);

  return (
    <PublicCard title={L.confirmEmailTitle}>
      {result.kind === 'checking' && <Skeleton rows={2} label={L.confirmEmailChecking} />}
      {result.kind === 'done' && (
        <div role="status">
          <p className="text-sm font-semibold text-ink">
            {L.confirmEmailDone}: <span className="break-all">{result.email}</span>
          </p>
          <p className="mt-1 text-sm text-ink-2">{L.confirmEmailDoneHint}</p>
        </div>
      )}
      {result.kind === 'invalid' && (
        <p role="alert" className="text-sm font-medium text-alert">
          {L.confirmEmailInvalid}
        </p>
      )}
      {result.kind === 'error' && (
        <p role="alert" className="text-sm font-medium text-alert">
          {result.message}
        </p>
      )}
      {result.kind !== 'checking' && (
        <Button tone="primary" size="lg" block onClick={() => navigate(ROUTES.dashboard)}>
          {L.confirmEmailGoApp}
        </Button>
      )}
    </PublicCard>
  );
}
