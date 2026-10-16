import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SUPPORT_ZALO } from '@/config';
import { requestPasswordReset } from '@/data/hooks/useRecovery';
import { L } from '@/i18n/labels';

/**
 * "Quên mật khẩu?" — một ô như đăng nhập. Máy chủ luôn trả lời giống nhau (không cho dò ai có tài
 * khoản) ⇒ màn này cũng chỉ nói "nếu có email đã xác nhận thì thư đang tới". Không có email, hay
 * không nhận được thư: nhắn Zalo kỹ thuật viên — họ xác minh qua điện thoại rồi đặt lại.
 */
export function ForgotPasswordForm({ initialIdentifier, onBack }: { readonly initialIdentifier: string; readonly onBack: () => void }) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    if (!identifier.trim()) {
      setError(L.forgotIdentifierRequired);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await requestPasswordReset(identifier);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : L.recoveryFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      {sent ? (
        <p role="status" className="rounded-xl border border-brand bg-paper p-3 text-sm text-ink">
          {L.forgotSent}
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-2">{L.forgotBody}</p>
          <Input
            label={L.authIdentifier}
            value={identifier}
            error={error}
            autoComplete="username"
            maxLength={200}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send();
            }}
          />
          <Button tone="primary" size="lg" block disabled={busy} onClick={send}>
            {busy ? L.authWorking : L.forgotSend}
          </Button>
        </>
      )}

      <div className="rounded-xl bg-paper p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">{L.forgotNoEmail}</p>
        <p className="mt-1">{L.forgotContactBody}</p>
        <a
          href={`https://zalo.me/${SUPPORT_ZALO}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex min-h-11 items-center font-semibold text-brand underline"
        >
          {L.forgotContact}: {SUPPORT_ZALO}
        </a>
      </div>

      <button type="button" onClick={onBack} className="min-h-11 text-sm font-semibold text-brand">
        {L.forgotBack}
      </button>
    </div>
  );
}
