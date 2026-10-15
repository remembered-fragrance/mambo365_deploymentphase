import { useRef, useState, type ComponentType } from 'react';
import type { OrgType } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BuildingIcon, CheckIcon, LeafIcon, StoreIcon } from '@/components/ui/icons';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { RoleDashboardPreview } from './RoleDashboardPreview';

interface RoleOption {
  readonly type: OrgType;
  readonly Icon: ComponentType<{ readonly className?: string }>;
  readonly title: string;
  readonly description: string;
  readonly benefits: readonly string[];
  readonly orgLabel: string;
  readonly orgPlaceholder: string;
  readonly orgPrefix: string;
}

const ROLES: readonly RoleOption[] = [
  {
    type: 'trader',
    Icon: StoreIcon,
    title: L.bootstrapTraderTitle,
    description: L.bootstrapTraderDesc,
    benefits: [L.bootstrapTraderBenefit1, L.bootstrapTraderBenefit2, L.bootstrapTraderBenefit3],
    orgLabel: L.bootstrapTraderOrgLabel,
    orgPlaceholder: L.bootstrapTraderOrgPlaceholder,
    orgPrefix: L.bootstrapTraderOrgPrefix,
  },
  {
    type: 'farmer',
    Icon: LeafIcon,
    title: L.bootstrapFarmerTitle,
    description: L.bootstrapFarmerDesc,
    benefits: [L.bootstrapFarmerBenefit1, L.bootstrapFarmerBenefit2, L.bootstrapFarmerBenefit3],
    orgLabel: L.bootstrapFarmerOrgLabel,
    orgPlaceholder: L.bootstrapFarmerOrgPlaceholder,
    orgPrefix: L.bootstrapFarmerOrgPrefix,
  },
  {
    type: 'enterprise',
    Icon: BuildingIcon,
    title: L.bootstrapEnterpriseTitle,
    description: L.bootstrapEnterpriseDesc,
    benefits: [
      L.bootstrapEnterpriseBenefit1,
      L.bootstrapEnterpriseBenefit2,
      L.bootstrapEnterpriseBenefit3,
    ],
    orgLabel: L.bootstrapEnterpriseOrgLabel,
    orgPlaceholder: L.bootstrapEnterpriseOrgPlaceholder,
    orgPrefix: L.bootstrapEnterpriseOrgPrefix,
  },
];

/**
 * Màn "Bác là ai?" sau đăng nhập / đăng ký khi `me.memberships` còn rỗng.
 *
 * Chỉ gọi `api.meBootstrap` — không `signUp` lại. Backend idempotent: gọi lại
 * khi đã có tổ chức trả về `Me` hiện tại, không tạo tổ chức thứ hai.
 */
export function BootstrapPage() {
  const { user, bootstrap, signOut } = useStore();
  const submitting = useRef(false);

  const [selectedType, setSelectedType] = useState<OrgType | null>(null);
  const [userName, setUserName] = useState(user?.name?.trim() ?? '');
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [previewRole, setPreviewRole] = useState<OrgType | null>(null);

  const selected = ROLES.find((role) => role.type === selectedType);

  const handleSelectType = (type: OrgType) => {
    const option = ROLES.find((role) => role.type === type);
    if (!option) return;

    setSelectedType(type);
    setError(undefined);

    const baseName = userName.trim() || user?.name?.trim() || 'Thu Mua';
    const previous = selected;
    const looksAuto =
      !orgName.trim() ||
      (previous !== undefined && orgName.trim().startsWith(previous.orgPrefix));
    if (looksAuto) setOrgName(`${option.orgPrefix} ${baseName}`);
  };

  const handleUserNameChange = (nextName: string) => {
    setUserName(nextName);
    if (!selected) return;
    const looksAuto =
      !orgName.trim() || orgName.trim().startsWith(selected.orgPrefix);
    if (looksAuto) {
      setOrgName(`${selected.orgPrefix} ${nextName.trim() || 'Thu Mua'}`);
    }
  };

  const canSubmit =
    selectedType !== null &&
    userName.trim().length > 0 &&
    orgName.trim().length > 0 &&
    !busy;

  const submit = async () => {
    if (!selected || !canSubmit || submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError(undefined);

    try {
      await bootstrap({
        orgType: selected.type,
        orgName: orgName.trim(),
        name: userName.trim(),
        phone: user?.phone,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : L.bootstrapFailed);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (previewRole) {
    return (
      <RoleDashboardPreview
        key={previewRole}
        role={previewRole}
        onRoleChange={setPreviewRole}
        onBack={() => setPreviewRole(null)}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl items-center px-4 py-8">
      <div className="card w-full p-5 sm:p-8">
        <header className="text-center">
          <p className="text-2xl font-extrabold tracking-tight text-brand">{L.appName}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-3">
            {L.bootstrapEyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
            {L.bootstrapTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{L.bootstrapSubtitle}</p>
        </header>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {error}
          </p>
        )}

        <div
          role="radiogroup"
          aria-label={L.bootstrapTitle}
          className="mt-6 grid gap-3 sm:grid-cols-3"
        >
          {ROLES.map((role) => {
            const isSelected = selectedType === role.type;
            const { Icon } = role;
            return (
              <button
                key={role.type}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={busy}
                onClick={() => handleSelectType(role.type)}
                className={`flex min-h-[11rem] flex-col rounded-2xl border-2 p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60 ${
                  isSelected
                    ? 'border-brand bg-brand/5 shadow-sm'
                    : 'border-rule bg-card hover:border-brand/40'
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    isSelected ? 'bg-brand text-paper' : 'bg-paper text-brand'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>

                <h2 className="mt-3 text-base font-bold text-ink">{role.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">{role.description}</p>

                <ul className="mt-3 flex flex-col gap-1.5">
                  {role.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-1.5 text-xs text-ink-2">
                      <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <span
                  className={`mt-auto flex h-5 w-5 items-center justify-center self-end rounded-full border-2 ${
                    isSelected ? 'border-brand bg-brand text-paper' : 'border-rule'
                  }`}
                  aria-hidden
                >
                  {isSelected && <CheckIcon className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-rule bg-paper p-4">
            <Input
              label={L.bootstrapName}
              value={userName}
              hint={L.bootstrapNameHint}
              autoComplete="name"
              disabled={busy}
              onChange={(e) => handleUserNameChange(e.target.value)}
            />
            <Input
              label={selected.orgLabel}
              value={orgName}
              hint={L.bootstrapOrgNameHint}
              placeholder={selected.orgPlaceholder}
              disabled={busy}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
            />
          </div>
        )}

        {!selected && (
          <p className="mt-4 text-center text-sm text-ink-3">{L.bootstrapPickRole}</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button tone="primary" size="lg" block disabled={!canSubmit} onClick={submit}>
            {busy ? L.bootstrapWorking : L.bootstrapContinue}
          </Button>
          <Button block disabled={busy} onClick={() => setPreviewRole('trader')}>
            {L.bootstrapPreviewDashboards}
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signOut()}
            className="min-h-11 text-sm font-medium text-ink-3 hover:text-ink disabled:opacity-50"
          >
            {L.bootstrapSignOut}
          </button>
        </div>
      </div>
    </div>
  );
}
