import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { WarningIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { useEmailReminder } from '@/data/hooks/useEmailReminder';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/** Hồ sơ vựa. Số điện thoại chỉ để xem — nó là khoá đăng nhập, không sửa ở đây. */
export function AccountCard() {
  const { user, updateProfile } = useStore();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [error, setError] = useState<string | undefined>();
  const reminder = useEmailReminder(Boolean(user?.email));

  const save = async () => {
    setError(undefined);
    try {
      await updateProfile({ name, businessName, email });
      toast({ message: L.save });
    } catch (e) {
      setError(e instanceof Error ? e.message : L.errorTitle);
    }
  };

  return (
    <Card title={L.navProfile}>
      <div className="flex flex-col gap-3">
        {reminder.show && (
          <div className="rounded-xl border border-alert bg-paper p-3">
            <p className="flex items-start gap-2 text-sm font-semibold text-alert">
              <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
              {L.emailMissingTitle}
            </p>
            <p className="mt-1 text-sm text-ink-2">{L.emailMissingBody}</p>
            <Button className="mt-2" onClick={reminder.snooze}>
              {L.emailMissingLater}
            </Button>
          </div>
        )}

        <Input label={L.profileOwner} value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label={L.profileBusiness}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <Input
          label={L.profileEmail}
          value={email}
          inputMode="email"
          error={error}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input label={L.profilePhone} value={user?.phone ?? '—'} readOnly />

        <Button tone="primary" block onClick={save}>
          {L.save}
        </Button>
      </div>
    </Card>
  );
}
