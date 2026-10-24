/**
 * Gói đang có cho làm việc này không — KE_HOACH_GOI_PRO §7. Bảng quyền lợi nằm ở `@mambo/contracts`
 * (`entitlementsFor`), máy chủ chặn theo đúng bảng đó; app chỉ khoá nút trước để không bày nút bấm vào là lỗi.
 *
 * Bậc gói lấy từ `useSubscription().plan` (dựng từ `/v1/me`, có bản nhớ trong máy) nên người cân cũng có,
 * mất mạng vẫn chạy. Không chặn: chế độ trình diễn (như hạn mức phiếu) và sổ của máy này (chưa có tổ chức,
 * cùng luật với `allows`).
 */

import { entitled, type Entitlement, type OrgType } from '@mambo/contracts';
import type { PlanTier } from '@mambo/core/subscription';
import { isDemoActive } from '../demoMode';
import { useStore } from '../useStore';
import { useSubscription } from './useSubscription';

export const entitledHere = (orgType: OrgType | null, tier: PlanTier, demo: boolean, entitlement: Entitlement): boolean =>
  !orgType || demo || entitled(orgType, tier, entitlement);

export function useEntitlement(entitlement: Entitlement): boolean {
  const { orgType, bookKey } = useStore();
  const { plan } = useSubscription();
  return entitledHere(orgType, plan.tier, isDemoActive(bookKey), entitlement);
}
