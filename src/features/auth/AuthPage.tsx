import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/data/useStore';
import { useBackend } from '@/data/hooks/useBackend';
import { L } from '@/i18n/labels';

type Mode = 'signIn' | 'signUp';

/**
 * Đăng nhập / đăng ký.
 *
 * MỘT ô nhận cả tên tài khoản, số điện thoại lẫn email (lỗi chặn L4) — tệp
 * người dùng phần lớn không có email, và bắt họ chọn "đăng nhập bằng gì" là
 * bắt trả lời một câu hỏi kỹ thuật trước khi vào được app.
 *
 * Ở máy tính: nửa trái nói app này làm gì, nửa phải là form. Ở điện thoại chỉ
 * còn form.
 */
export function AuthPage() {
  const { signIn, signUp } = useStore();
  const online = useBackend();

  const [mode, setMode] = useState<Mode>('signIn');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      if (mode === 'signIn') await signIn(identifier, password);
      else await signUp({ name, phone: identifier, password, referralCode });
    } catch (e) {
      setError(e instanceof Error ? e.message : L.authFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl items-center px-4 py-8">
      <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <p className="text-3xl font-extrabold tracking-tight text-brand">{L.appName}</p>
          <p className="mt-3 max-w-sm text-lg text-ink-2">{L.authTagline}</p>
        </div>

        <div className="card p-5">
          <h1 className="text-xl font-extrabold text-ink lg:hidden">{L.appName}</h1>
          <h2 className="mt-1 text-lg font-bold text-ink">
            {mode === 'signIn' ? L.authSignIn : L.authSignUp}
          </h2>

          {!online && <p className="mt-2 text-sm text-ink-3">{L.authNoServer}</p>}

          <div className="mt-4 flex flex-col gap-3">
            {mode === 'signUp' && (
              <Input label={L.authName} value={name} onChange={(e) => setName(e.target.value)} />
            )}

            <Input
              label={L.authIdentifier}
              value={identifier}
              hint={L.authIdentifierHint}
              autoComplete="username"
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <Input
              label={L.authPassword}
              type="password"
              value={password}
              hint={L.authPasswordHint}
              error={error}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
            />

            {/* Mã mời để CUỐI và không bắt buộc: người đăng ký không có mã
                không được phải nghĩ xem mình thiếu cái gì. */}
            {mode === 'signUp' && (
              <Input
                label={L.referralAtSignUp}
                value={referralCode}
                hint={L.referralAtSignUpHint}
                autoCapitalize="characters"
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              />
            )}

            <Button tone="primary" size="lg" block disabled={busy} onClick={submit}>
              {busy ? L.authWorking : mode === 'signIn' ? L.authSignIn : L.authSignUp}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                setError(undefined);
              }}
              className="min-h-11 text-sm font-semibold text-brand"
            >
              {mode === 'signIn' ? L.authToSignUp : L.authToSignIn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
