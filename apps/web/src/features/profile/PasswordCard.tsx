import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/** Đổi mật khẩu. Gõ hai lần — sai một chữ là mất đường vào sổ của chính mình. */
export function PasswordCard() {
  const { changePassword } = useStore();
  const toast = useToast();
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(L.passwordTooShort);
      return;
    }
    if (next !== again) {
      setError(L.passwordMismatch);
      return;
    }
    setError(undefined);
    try {
      await changePassword(next);
      setNext('');
      setAgain('');
      toast({ message: L.passwordChanged });
    } catch (e) {
      setError(e instanceof Error ? e.message : L.errorTitle);
    }
  };

  return (
    <Card title={L.changePassword}>
      <div className="flex flex-col gap-3">
        <Input
          label={L.newPassword}
          type="password"
          value={next}
          hint={L.authPasswordHint}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          label={L.repeatPassword}
          type="password"
          value={again}
          error={error}
          onChange={(e) => setAgain(e.target.value)}
        />
        <Button tone="primary" block onClick={submit}>
          {L.changePassword}
        </Button>
      </div>
    </Card>
  );
}
