import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { LEGAL_LINKS } from '@/config';
import { detectIdentifierKind, normalizePhone } from '@mambo/core/identifier';
import { useStore } from '@/data/useStore';
import { useBackend } from '@/data/hooks/useBackend';
import { L } from '@/i18n/labels';

type Mode = 'signIn' | 'signUp';

/** Lỗi của ô SĐT / email lúc đăng ký — hiện ngay dưới đúng ô đó, không dồn xuống ô mật khẩu. */
interface SignUpErrors {
  readonly phone?: string;
  readonly email?: string;
}

const validateSignUp = (phone: string, email: string): SignUpErrors => ({
  phone: !phone.trim() ? L.authPhoneRequired : normalizePhone(phone) ? undefined : L.authPhoneInvalid,
  email: email.trim() && detectIdentifierKind(email.trim()) !== 'email' ? L.authEmailInvalid : undefined,
});

/** Lỗi từ tầng dữ liệu nói về SĐT (trùng số, sai số) thì cũng thuộc về ô SĐT. */
const isPhoneError = (message: string): boolean =>
  message === L.authPhoneTaken || message === L.authPhoneInvalid;

/**
 * Đăng nhập / đăng ký.
 *
 * Đăng nhập:
 * - Một ô nhận số điện thoại, email hoặc tên đăng nhập.
 *
 * Đăng ký:
 * - Tách số điện thoại và email thành hai ô riêng.
 * - Số điện thoại là bắt buộc.
 * - Email là không bắt buộc.
 */
export function AuthPage() {
  const { signIn, signUp } = useStore();
  const online = useBackend();

  const [mode, setMode] = useState<Mode>('signIn');

  // Đăng nhập vẫn dùng một ô chung.
  const [identifier, setIdentifier] = useState('');

  // Đăng ký dùng dữ liệu riêng.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<SignUpErrors>({});
  const [consentMissing, setConsentMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (mode === 'signUp') {
      const invalid = validateSignUp(phone, email);
      setFieldErrors(invalid);
      if (invalid.phone || invalid.email) return;
    }
    if (mode === 'signUp' && !consent) {
      setConsentMissing(true);
      return;
    }

    setBusy(true);
    setError(undefined);

    try {
      if (mode === 'signIn') {
        await signIn(identifier.trim(), password);
      } else {
        await signUp({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
          referralCode: referralCode.trim() || undefined,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : L.authFailed;
      if (mode === 'signUp' && isPhoneError(message)) setFieldErrors({ phone: message });
      else setError(message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
    setError(undefined);
    setFieldErrors({});
    setConsentMissing(false);
    setPassword('');
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl items-center px-4 py-8">
      <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <div className="flex items-center gap-3">
            <Logo className="h-14 w-14" />
            <p className="text-3xl font-extrabold tracking-tight text-brand">{L.appName}</p>
          </div>
          <p className="mt-3 max-w-sm text-lg text-ink-2">{L.authTagline}</p>
        </div>

        <div className="card p-5">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink lg:hidden">
            <Logo />
            {L.appName}
          </h1>
          <h2 className="mt-1 text-lg font-bold text-ink">
            {mode === 'signIn' ? L.authSignIn : L.authSignUp}
          </h2>

          {!online && <p className="mt-2 text-sm text-ink-3">{L.authNoServer}</p>}

          <div className="mt-4 flex flex-col gap-3">
            {mode === 'signUp' && (
              <Input
                label={L.authName}
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
              />
            )}

            {mode === 'signIn' ? (
              <Input
                label={L.authIdentifier}
                value={identifier}
                hint={L.authIdentifierHint}
                autoComplete="username"
                onChange={(e) => setIdentifier(e.target.value)}
              />
            ) : (
              <>
                <Input
                  label={L.authPhone}
                  value={phone}
                  hint={L.authPhoneHint}
                  error={fieldErrors.phone}
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                />

                <Input
                  label={L.authEmailOptional}
                  type="email"
                  value={email}
                  hint={L.authEmailOptionalHint}
                  error={fieldErrors.email}
                  inputMode="email"
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                />
              </>
            )}

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

            {mode === 'signUp' && (
              <Input
                label={L.referralAtSignUp}
                value={referralCode}
                hint={L.referralAtSignUpHint}
                autoCapitalize="characters"
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              />
            )}

            {mode === 'signUp' && (
              <label className="flex min-h-11 items-start gap-3 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) setConsentMissing(false);
                  }}
                  className="mt-1 h-5 w-5 shrink-0 accent-brand"
                />
                <span>
                  {L.consentPrefix}{' '}
                  <a
                    href={LEGAL_LINKS.terms}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand underline"
                  >
                    {L.legalTerms}
                  </a>{' '}
                  {L.consentAnd}{' '}
                  <a
                    href={LEGAL_LINKS.privacy}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand underline"
                  >
                    {L.legalPrivacy}
                  </a>
                </span>
              </label>
            )}

            {consentMissing && (
              <p role="alert" className="text-sm font-medium text-alert">
                {L.consentRequired}
              </p>
            )}

            <Button tone="primary" size="lg" block disabled={busy} onClick={submit}>
              {busy ? L.authWorking : mode === 'signIn' ? L.authSignIn : L.authSignUp}
            </Button>

            <button
              type="button"
              onClick={switchMode}
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
