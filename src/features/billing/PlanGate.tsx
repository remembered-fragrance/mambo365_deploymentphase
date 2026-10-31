import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Entitlement } from '@mambo/contracts';
import { LockIcon } from '@/components/ui/icons';
import { usePlanTooLow } from '@/data/hooks/useEntitlement';
import { track } from '@/data/hooks/useTrack';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { useAccess } from '../shared/useAccess';

interface Props {
  /** Câu nói cái gì vẫn còn và cái gì cần gia hạn. */
  readonly reason: string;
  /** Ghi vào `quota_wall_shown` để biết bức tường nào được thấy nhiều. */
  readonly feature:
    | 'members'
    | 'attachments'
    | 'branches'
    | 'quality'
    | 'rubber'
    | 'audit'
    | 'statement'
    | 'reports'
    | 'tax'
    | 'pay'
    | 'analytics'
    | 'map_prices'
    | 'season';
}

/** Ba việc gói Thương lái không có (`PLAN_EXCLUDES.thuong_lai`) — bị chặn vì gói thấp thì nói câu riêng. */
const SOLO: Partial<Record<Props['feature'], { readonly entitlement: Entitlement; readonly reason: string }>> = {
  members: { entitlement: 'members:add', reason: L.gateSoloMembers },
  audit: { entitlement: 'audit:view', reason: L.gateSoloAudit },
  reports: { entitlement: 'reports:org', reason: L.gateSoloReports },
};

/**
 * Chỗ của một nút bị khoá vì gói đã hết (KE_HOACH_GOI_PRO §7). Nói thứ đang có vẫn giữ nguyên trước,
 * rồi mới tới việc cần gia hạn. Chủ (`billing:manage`) thấy đường sang màn gói; người cân, quản lý
 * không trả tiền được nên chỉ thấy câu báo chủ. Gói Thương lái còn hạn mà bị chặn (0.28.0): không phải hết hạn —
 * câu mời nâng lên gói Vựa thay cho câu gia hạn.
 */
export function PlanGate({ reason, feature }: Props) {
  const { can } = useAccess();
  const solo = SOLO[feature];
  const tooLow = usePlanTooLow(solo?.entitlement ?? 'sync') && solo !== undefined;
  useEffect(() => track('quota_wall_shown', { feature }), [feature]);
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rule bg-card p-3 text-sm text-ink-2">
      <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
      <p>
        {tooLow ? solo.reason : reason}{' '}
        {can('billing:manage') ? (
          <Link to={ROUTES.plans} className="font-semibold text-brand underline">
            {tooLow ? L.gateUpgradeVua : L.gateSeePlans}
          </Link>
        ) : (
          <span className="font-semibold">{L.gateAskOwner}</span>
        )}
      </p>
    </div>
  );
}
