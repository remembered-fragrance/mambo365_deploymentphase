/**
 * Gói đang có cho làm việc này không — KE_HOACH_GOI_PRO §7. Bảng quyền lợi nằm ở `@mambo/contracts`
 * (`entitlementsFor`), máy chủ chặn theo đúng bảng đó; app chỉ khoá nút trước để không bày nút bấm vào là lỗi.
 *
 * Bậc gói lấy từ `useSubscription().plan` (dựng từ `/v1/me`, có bản nhớ trong máy) nên người cân cũng có,
 * mất mạng vẫn chạy. Mã gói (Thương lái / Vựa, 0.28.0) lấy từ `/v1/me` của store. Không chặn: chế độ trình diễn
 * (như hạn mức phiếu) và sổ của máy này (chưa có tổ chức, cùng luật với `allows`).
 */

import { entitled, type Entitlement, type OrgType, type PlanCode } from '@mambo/contracts';
import type { PlanTier } from '@mambo/core/subscription';
import { isDemoActive } from '../demoMode';
import { useStore } from '../useStore';
import { useSubscription } from './useSubscription';

export const entitledHere = (
  orgType: OrgType | null,
  tier: PlanTier,
  plan: PlanCode | null,
  demo: boolean,
  entitlement: Entitlement,
): boolean => !orgType || demo || entitled(orgType, tier, plan, entitlement);

export function useEntitlement(entitlement: Entitlement): boolean {
  const { orgType, bookKey } = useStore();
  const { plan, planCode } = useSubscription();
  return entitledHere(orgType, plan.tier, planCode, isDemoActive(bookKey), entitlement);
}

/**
 * Bị chặn chỉ vì gói thấp (Thương lái), gói vẫn còn hạn — mời nâng lên gói Vựa thay vì "gia hạn". Cùng phép thử với
 * `assertEntitlement` của máy chủ: bỏ mã gói ra mà có quyền lợi thì thiếu là do gói.
 */
export function usePlanTooLow(entitlement: Entitlement): boolean {
  const { orgType, bookKey } = useStore();
  const { plan, planCode } = useSubscription();
  const demo = isDemoActive(bookKey);
  return !entitledHere(orgType, plan.tier, planCode, demo, entitlement) && entitledHere(orgType, plan.tier, null, demo, entitlement);
}
