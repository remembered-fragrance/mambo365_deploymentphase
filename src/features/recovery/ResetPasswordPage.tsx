import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ROUTES } from '@/features/shared/navItems';
import { passwordProblem } from '@/features/shared/password';
import { PublicCard } from './PublicCard';

type Phase = 'checking' | 'form' | 'invalid' | 'signedIn' | 'done';

/**
 * Mã trong link chỉ đổi được MỘT lần. StrictMode chạy effect hai lần ⇒ lần thứ hai dùng chung lời
 * gọi đang bay, không gửi mã lần nữa (lần nữa là "đã dùng").
 */
const opening = new Map<string, Promise<void>>();

/**
 * `/dat-lai-mat-khau?token_hash=…&type=recovery` — mở từ thư "Quên mật khẩu?" (BE 0.16.0).
 * Đổi mã lấy phiên (như đăng nhập), rồi đặt mật khẩu mới. Máy đang đăng nhập sẵn thì không đụng
 * vào phiên đó — sổ chưa đồng bộ của người đang dùng máy không bị thay bằng tài khoản khác.
 */
export function ResetPasswordPage() {
  const { user, status, openRecoverySession, changePassword } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tokenHash] = useState(() => (params.get('type') === 'recovery' ? (params.get('token_hash') ?? '') : ''));
  const [phase, setPhase] = useState<Phase>('checking');
  const started = useRef(false);
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status.loading || started.current) return;
    started.current = true;
    if (!tokenHash) {
      setPhase('invalid');
      return;
    }
    if (user) {
      setPhase('signedIn');
      return;
    }
    let open = opening.get(tokenHash);
    if (!open) {
      open = openRecoverySession(tokenHash);
      opening.set(tokenHash, open);
    }
    open.then(() => setPhase('form')).catch(() => setPhase('invalid'));
  }, [status.loading, user, tokenHash, openRecoverySession]);

  const save = async () => {
    const problem = passwordProblem(next) ?? (next !== again ? L.passwordMismatch : undefined);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await changePassword(next);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : L.resetFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicCard title={L.resetTitle}>
      {phase === 'checking' && <Skeleton rows={2} label={L.resetChecking} />}

      {phase === 'invalid' && (
        <>
          <p role="alert" className="text-sm font-medium text-alert">
            {L.resetLinkInvalid}
          </p>
          <Button tone="primary" block onClick={() => navigate(ROUTES.dashboard)}>
            {L.forgotBack}
          </Button>
        </>
      )}

      {phase === 'signedIn' && (
        <>
          <p className="text-sm text-ink-2">{L.resetSignedIn}</p>
          <Button tone="primary" block onClick={() => navigate(ROUTES.profile)}>
            {L.resetGoProfile}
          </Button>
        </>
      )}

      {phase === 'form' && (
        <>
          <Input
            label={L.newPassword}
            type="password"
            value={next}
            hint={L.authPasswordHint}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
          />
          <Input
            label={L.repeatPassword}
            type="password"
            value={again}
            error={error}
            autoComplete="new-password"
            onChange={(e) => setAgain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
          />
          <Button tone="primary" size="lg" block disabled={busy} onClick={save}>
            {busy ? L.authWorking : L.resetSave}
          </Button>
        </>
      )}

      {phase === 'done' && (
        <>
          <p role="status" className="text-sm font-medium text-ink">
            {L.resetDone}
          </p>
          <Button tone="primary" size="lg" block onClick={() => navigate(ROUTES.dashboard)}>
            {L.resetGoApp}
          </Button>
        </>
      )}
    </PublicCard>
  );
}
