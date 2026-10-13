import { useEffect, useState } from 'react';
import type { OrgType } from '@mambo/contracts';
import { formatPhoneVn } from '@mambo/core/identifier';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { WarningIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { useEmailReminder } from '@/data/hooks/useEmailReminder';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { changedProfileFields } from './profilePatch';

/** Nhãn tên tổ chức theo vai — chưa biết vai thì không hiện ô, không đoán. */
const BUSINESS_LABEL: Readonly<Record<OrgType, string>> = {
  farmer: L.profileBusinessFarmer,
  trader: L.profileBusiness,
  enterprise: L.profileBusinessEnterprise,
};

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
 * Số điện thoại là khoá đăng nhập; tên hộ / vựa / doanh nghiệp là của tổ chức — cả hai chỉ để xem.
 */
export function AccountCard() {
  const { user, currentOrg, updateProfile } = useStore();
  const toast = useToast();
  const savedName = user?.name ?? '';
  const savedUsername = user?.username ?? '';
  const savedEmail = user?.email ?? '';
  const [name, setName] = useState(savedName);
  const [username, setUsername] = useState(savedUsername);
  const [email, setEmail] = useState(savedEmail);
  const [edited, setEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const reminder = useEmailReminder(Boolean(user?.email));
  const org = currentOrg?.organization;

  // Tên đăng nhập / email khôi phục về SAU khi màn đã mở (GET /v1/me/profile chạy nền):
  // chưa gõ gì thì nhận giá trị mới, không thì giữ chữ người dùng đang sửa.
  useEffect(() => {
    if (edited) return;
    setName(savedName);
    setUsername(savedUsername);
    setEmail(savedEmail);
  }, [edited, savedName, savedUsername, savedEmail]);

  const save = async () => {
    const patch = changedProfileFields(
      { name: savedName, username: savedUsername, email: savedEmail },
      { name, username, email },
    );
    setErrors({});
    setFormError(undefined);
    if (Object.keys(patch).length === 0) {
      setEdited(false);
      toast({ message: L.profileSaved });
      return;
    }
    setBusy(true);
    try {
      await updateProfile(patch);
      setEdited(false);
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
          onChange={(e) => {
            setName(e.target.value);
            setEdited(true);
          }}
        />
        <Input
          label={L.profileUsername}
          value={username}
          hint={L.setupUsernameHint}
          error={errors.username}
          maxLength={32}
          autoCapitalize="none"
          autoComplete="username"
          onChange={(e) => {
            setUsername(e.target.value);
            setEdited(true);
          }}
        />
        <Input
          label={L.profileEmail}
          type="email"
          value={email}
          hint={L.profileEmailHint}
          error={errors.recoveryEmail}
          inputMode="email"
          autoComplete="email"
          onChange={(e) => {
            setEmail(e.target.value);
            setEdited(true);
          }}
        />
        <Input
          label={L.profilePhone}
          value={user?.phone ? formatPhoneVn(user.phone) : '—'}
          hint={L.profilePhoneHint}
          readOnly
        />
        {org?.name && (
          <Input
            label={BUSINESS_LABEL[org.type]}
            value={org.name}
            hint={L.profileBusinessHint}
            readOnly
          />
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
