import { useState } from 'react';
import { formatPhoneVn } from '@/core/identifier';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { WarningIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { useEmailReminder } from '@/data/hooks/useEmailReminder';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

type Field = 'name' | 'username' | 'recoveryEmail';
type FieldErrors = Partial<Record<Field, string>>;

/** `VALIDATION_FAILED` của API mang `details.fields` = { tên trường: câu lỗi }. */
const fieldErrorsOf = (e: unknown): FieldErrors => {
  const fields = (e as { details?: { fields?: unknown } } | null)?.details?.fields;
  if (!fields || typeof fields !== 'object') return {};
  const out: FieldErrors = {};
  for (const key of ['name', 'username', 'recoveryEmail'] as const) {
    const msg = (fields as Record<string, unknown>)[key];
    if (typeof msg === 'string') out[key] = msg;
  }
  return out;
};

/**
 * Hồ sơ người dùng: tên, tên đăng nhập, email khôi phục (`PATCH /v1/me/profile`).
 * Số điện thoại là khoá đăng nhập; tên vựa là của tổ chức — cả hai chỉ để xem.
 */
export function AccountCard() {
  const { user, currentOrg, updateProfile } = useStore();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const reminder = useEmailReminder(Boolean(user?.email));
  const businessName = currentOrg?.organization.name ?? user?.businessName ?? '';

  const save = async () => {
    setErrors({});
    setFormError(undefined);
    setBusy(true);
    try {
      await updateProfile({ name, username, email });
      toast({ message: L.profileSaved });
    } catch (e) {
      const fields = fieldErrorsOf(e);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(e instanceof Error ? e.message : L.errorTitle);
    } finally {
      setBusy(false);
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

        <Input
          label={L.profileOwner}
          value={name}
          error={errors.name}
          maxLength={80}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={L.profileUsername}
          value={username}
          hint={L.setupUsernameHint}
          error={errors.username}
          maxLength={32}
          autoCapitalize="none"
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label={L.profileEmail}
          type="email"
          value={email}
          hint={L.profileEmailHint}
          error={errors.recoveryEmail}
          inputMode="email"
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={L.profilePhone}
          value={user?.phone ? formatPhoneVn(user.phone) : '—'}
          hint={L.profilePhoneHint}
          readOnly
        />
        {businessName && (
          <Input label={L.profileBusiness} value={businessName} hint={L.profileBusinessHint} readOnly />
        )}

        {formError && (
          <p role="alert" className="text-sm font-medium text-alert">
            {formError}
          </p>
        )}

        <Button tone="primary" block disabled={busy} onClick={save}>
          {busy ? L.setupWorking : L.save}
        </Button>
      </div>
    </Card>
  );
}
