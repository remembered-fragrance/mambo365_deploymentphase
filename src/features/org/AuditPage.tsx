import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatDateTime, formatVnd } from '@mambo/core/format';
import type { AuditEntryView } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { useMembers } from '@/data/hooks/useOrg';
import { listAudit, orgErrorMessage } from '@/data/org';
import { L } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';
import { ROUTES } from '../shared/navItems';

/** Tên việc. Máy chủ thêm loại mới thì app cũ hiện tên thô — không vỡ màn. */
const ACTION: Readonly<Record<string, string>> = {
  'organization.bootstrapped': L.auditActOrganizationBootstrapped,
  'organization.updated': L.auditActOrganizationUpdated,
  'receipt.updated': L.auditActReceiptUpdated,
  'receipt.deleted': L.auditActReceiptDeleted,
  'payment.voided': L.auditActPaymentVoided,
  'member.added': L.auditActMemberAdded,
  'member.removed': L.auditActMemberRemoved,
  'member.left': L.auditActMemberLeft,
  'member.role_changed': L.auditActMemberRoleChanged,
  'link.invited': L.auditActLinkInvited,
  'link.accepted': L.auditActLinkAccepted,
  'link.revoked': L.auditActLinkRevoked,
  'branch.created': L.auditActBranchCreated,
  'branch.updated': L.auditActBranchUpdated,
  'branch.over_limit': L.auditActBranchOverLimit,
  'place.created': L.auditActPlaceCreated,
  'place.updated': L.auditActPlaceUpdated,
  'place.deleted': L.auditActPlaceDeleted,
  'plan.activated': L.auditActPlanActivated,
  'plan.referral_bonus': L.auditActPlanReferralBonus,
};

export const auditActionText = (action: string): string => ACTION[action] ?? action;

const fields = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const money = (v: unknown): string => (typeof v === 'number' ? formatVnd(v) : '—');
const day = (v: unknown): string => (typeof v === 'string' ? formatDate(v) : '—');
const note = (v: unknown): string => (typeof v === 'string' && v ? `"${v}"` : L.auditNoteEmpty);

/** Mấy dòng nói rõ việc đó đụng vào cái gì — chỉ cho các việc về tiền, phiếu; việc khác tên việc là đủ. */
export const auditDetail = (e: Pick<AuditEntryView, 'action' | 'before' | 'after'>): string[] => {
  const before = fields(e.before);
  const after = fields(e.after);
  switch (e.action) {
    case 'receipt.deleted':
      return [`${L.auditReceiptOf} ${day(before.date)} · ${money(before.total)}`];
    case 'payment.voided':
      return [`${L.auditPaymentOf} ${day(before.date)} · ${money(before.amount)}`];
    case 'receipt.updated': {
      const lines: string[] = [];
      if (before.note !== after.note) lines.push(`${L.auditNote}: ${note(before.note)} → ${note(after.note)}`);
      if (before.photos !== after.photos) lines.push(`${String(before.photos)} → ${String(after.photos)} ${L.auditPhotos}`);
      return lines;
    }
    default:
      return [];
  }
};

interface Page {
  readonly entries: readonly AuditEntryView[];
  readonly cursor: string | null;
}

/**
 * Nhật ký sửa, xoá (V6, D4) — chỉ chủ. Máy chủ ghi ở mọi gói; xem cần `audit:view`, hết gói thì hiện
 * `PlanGate` (nhật ký vẫn được ghi, gia hạn là xem lại được hết). Lọc theo người; "Xem thêm" đi tiếp bằng `cursor`.
 */
export function AuditPage() {
  const paid = useEntitlement('audit:view');
  const members = useMembers();
  const [actor, setActor] = useState('');
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!paid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(null);
    listAudit(actor ? { actor } : {}).then(
      (r) => !cancelled && setPage(r),
      (err: unknown) => !cancelled && setError(orgErrorMessage(err)),
    ).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [paid, actor, tick]);

  const more = async () => {
    if (!page?.cursor) return;
    setLoading(true);
    try {
      const next = await listAudit({ ...(actor ? { actor } : {}), cursor: page.cursor });
      setPage({ entries: [...page.entries, ...next.entries], cursor: next.cursor });
    } catch (err) {
      setError(orgErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const people = [
    { value: '', label: L.auditEveryone },
    ...(members.data ?? []).map((m) => ({ value: m.userId, label: m.name ?? '—' })),
  ];

  return (
    <PageContainer width="content">
      <PageHeader title={L.navAudit} subtitle={L.auditSubtitle} />
      {!paid ? (
        <PlanGate reason={L.gateAudit} feature="audit" />
      ) : (
        <div className="grid gap-4">
          <Card>
            <Select label={L.auditPerson} value={actor} options={people} onValueChange={setActor} />
          </Card>

          {error && !page ? (
            <ErrorState
              title={L.auditFailed}
              description={error}
              actions={<Button onClick={() => setTick((t) => t + 1)}>{L.retry}</Button>}
            />
          ) : !page ? (
            <Skeleton rows={4} label={L.loading} />
          ) : page.entries.length === 0 ? (
            <EmptyState title={L.auditEmpty} icon="📒" />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {page.entries.map((e) => (
                  <li key={e.id} className="card flex flex-col gap-1 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-bold text-ink">{auditActionText(e.action)}</span>
                      <span className="num shrink-0 text-sm text-ink-3">{formatDateTime(e.at)}</span>
                    </div>
                    <span className="text-sm text-ink-2">{e.actor?.name ?? L.auditSystem}</span>
                    {auditDetail(e).map((line) => (
                      <span key={line} className="num text-sm text-ink">
                        {line}
                      </span>
                    ))}
                    {e.action === 'receipt.updated' && e.entityId && (
                      <Link
                        to={ROUTES.receiptDetail(e.entityId)}
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline"
                      >
                        {L.auditOpenReceipt}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {error && <p className="text-sm text-alert">{error}</p>}
              {page.cursor && (
                <Button block disabled={loading} onClick={() => void more()}>
                  {L.auditMore}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
}
