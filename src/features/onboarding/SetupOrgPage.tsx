import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { asksOrgName, emptyFields, orgNameFor, SETUP_CHOICES, type SetupChoice } from './setupOrg';

const ORG_NAME_TEXT = {
  trader: { label: L.setupOrgNameTrader, hint: L.setupOrgNameTraderHint },
  enterprise: { label: L.setupOrgNameEnterprise, hint: L.setupOrgNameEnterpriseHint },
} as const;

type Field = 'orgType' | 'orgName' | 'name' | 'username';
type FieldErrors = Partial<Record<Field, string>>;

/** `VALIDATION_FAILED` của API mang `details.fields` = { tên trường: câu lỗi }. */
const fieldErrorsOf = (e: unknown): FieldErrors => {
  const fields = (e as { details?: { fields?: unknown } } | null)?.details?.fields;
  if (!fields || typeof fields !== 'object') return {};
  const out: FieldErrors = {};
  for (const key of ['orgType', 'orgName', 'name', 'username'] as const) {
    const msg = (fields as Record<string, unknown>)[key];
    if (typeof msg === 'string') out[key] = msg;
  }
  return out;
};

/**
 * Bước "Bạn là ai?" (FRONTEND.md §5.1): ngay sau đăng ký, `memberships` rỗng.
 * Một lần `bootstrap` tạo hồ sơ (kèm SĐT + email khôi phục), tổ chức, vai trò
 * `owner`, gói dùng thử (vựa, DN). Form là state cục bộ ⇒ xoá sạch khi tạo xong
 * hoặc đăng xuất (component rời màn) — không để người sau thừa hưởng lựa chọn.
 */
export function SetupOrgPage() {
  const { user, bootstrap, signOut } = useStore();
  const [choice, setChoice] = useState<SetupChoice | null>(null);
  const orgType = choice?.type ?? null;
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!orgType) {
      setErrors({ orgType: L.setupPickType });
      return;
    }
    // Nông dân: tên hộ lấy từ tên hiển thị ⇒ tên trống thì báo ngay ở ô tên.
    const empty = emptyFields(orgType, orgName, name);
    if (Object.keys(empty).length > 0) {
      setErrors(empty);
      return;
    }
    setBusy(true);
    setErrors({});
    setFormError(undefined);
    try {
      await bootstrap({
        orgType,
        orgName: orgNameFor(orgType, orgName, name),
        name: name.trim(),
        ...(choice?.plan ? { plan: choice.plan } : {}),
        ...(username.trim() ? { username: username.trim().toLowerCase() } : {}),
      });
    } catch (e) {
      const fields = fieldErrorsOf(e);
      // Nông dân không thấy ô tên hộ: lỗi của nó (vd. quá dài) hiện ở ô tên hiển thị.
      if (!asksOrgName(orgType) && fields.orgName) {
        fields.name ??= fields.orgName;
        delete fields.orgName;
      }
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(e instanceof Error ? e.message : L.setupFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-8">
      <div className="card w-full p-5">
        <h1 className="text-xl font-extrabold text-ink">{L.setupTitle}</h1>
        <p className="mt-1 text-sm text-ink-2">{L.setupSubtitle}</p>

        <div role="radiogroup" aria-label={L.setupTitle} className="mt-4 grid gap-2">
          {SETUP_CHOICES.map((option) => {
            const selected = choice?.key === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setChoice(option);
                  setErrors((prev) => ({ ...prev, orgType: undefined }));
                }}
                className={`min-h-16 rounded-xl border p-3 text-left ${selected ? 'border-brand bg-paper' : 'border-rule bg-card'}`}
              >
                <span className={`block text-base font-bold ${selected ? 'text-brand' : 'text-ink'}`}>
                  {option.label}
                </span>
                <span className="mt-0.5 block text-sm text-ink-3">{option.hint}</span>
              </button>
            );
          })}
          {errors.orgType && (
            <p role="alert" className="text-sm font-medium text-alert">
              {errors.orgType}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {asksOrgName(orgType) && (
            <Input
              label={ORG_NAME_TEXT[orgType].label}
              value={orgName}
              hint={ORG_NAME_TEXT[orgType].hint}
              error={errors.orgName}
              maxLength={120}
              onChange={(e) => setOrgName(e.target.value)}
            />
          )}
          <Input
            label={L.setupName}
            value={name}
            error={errors.name}
            maxLength={80}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label={L.setupUsername}
            value={username}
            hint={L.setupUsernameHint}
            error={errors.username}
            maxLength={32}
            autoCapitalize="none"
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
          />

          {formError && (
            <p role="alert" className="text-sm font-medium text-alert">
              {formError}
            </p>
          )}

          <Button tone="primary" size="lg" block disabled={busy} onClick={submit}>
            {busy ? L.setupWorking : L.setupSubmit}
          </Button>
          <button type="button" onClick={() => void signOut()} className="min-h-11 text-sm font-semibold text-ink-3">
            {L.setupSignOut}
          </button>
        </div>
      </div>
    </div>
  );
}
