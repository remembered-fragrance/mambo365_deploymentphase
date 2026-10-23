import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { WarningIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { useEmailReminder } from '@/data/hooks/useEmailReminder';
import type { AccountProfileController } from '@/data/hooks/useAccountProfile';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { profileBusinessLabel, profileOwnerLabel, profileTitle } from '@/i18n/profileLabels';

/** Hồ sơ tài khoản. Tên tổ chức lấy từ membership đang chọn; SĐT là khoá đăng nhập. */
export function AccountCard({ account }: { readonly account: AccountProfileController }) {
  const { user, currentOrg, orgType } = useStore();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const businessName = currentOrg?.organization.name ?? '';
  const reminder = useEmailReminder(Boolean(email));

  useEffect(() => {
    if (!account.profile) return;
    setName(account.profile.name);
    setUsername(account.profile.username ?? '');
    setEmail(account.profile.recoveryEmail ?? '');
  }, [account.profile]);

  const save = async () => {
    setVerificationMessage(null);
    try {
      await account.save({ name, username, email });
      toast({ message: L.save });
    } catch { /* account.error is rendered below */ }
  };

  const sendVerification = async () => {
    setVerificationMessage(null);
    try {
      const status = await account.sendVerification();
      setVerificationMessage({
        sent: L.profileVerificationSent,
        already_verified: L.profileEmailVerified,
        no_email: L.profileVerificationNoEmail,
        too_soon: L.profileVerificationTooSoon,
      }[status]);
    } catch { /* account.error is rendered below */ }
  };

  return (
    <Card title={profileTitle(orgType)}>
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

        {account.error && <div role="alert" className="rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm text-alert">{account.error}{!account.loading && <Button className="ml-2" onClick={() => void account.refresh()}>{L.dashboardRetry}</Button>}</div>}
        {account.loading && <p className="text-sm text-ink-3" aria-live="polite">{L.loading}</p>}
        <Input label={profileOwnerLabel(orgType)} value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label={profileBusinessLabel(orgType)}
          value={businessName}
          readOnly
        />
        <Input label={L.profileUsername} value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input
          label={L.profileEmail}
          value={email}
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        {account.profile?.recoveryEmail && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={account.profile.recoveryEmailVerified ? 'text-ink-2' : 'text-alert'}>
              {account.profile.recoveryEmailVerified ? L.profileEmailVerified : L.profileEmailUnverified}
            </span>
            {!account.profile.recoveryEmailVerified && <Button disabled={account.loading || account.saving} onClick={() => void sendVerification()}>{L.profileSendVerification}</Button>}
          </div>
        )}
        {verificationMessage && <p role="status" className="text-sm text-ink-2">{verificationMessage}</p>}
        {account.profile?.referralCode && <Input label={L.profileReferralCode} value={account.profile.referralCode} readOnly />}
        <Input label={L.profilePhone} value={user?.phone ?? '—'} readOnly />

        <Button tone="primary" block disabled={!account.profile || account.loading || account.saving} onClick={() => void save()}>
          {account.saving ? L.loading : L.save}
        </Button>
      </div>
    </Card>
  );
}
