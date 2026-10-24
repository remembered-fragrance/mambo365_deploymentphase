/**
 * Miễn phí và trả phí khác nhau chỗ nào — viết bằng lời người dùng.
 *
 * Không phải bảng dấu tích. Mỗi dòng nói RA ĐƯỢC GÌ ở từng bên, vì "Công nợ ✓"
 * không nói cho chủ vựa biết thứ họ sắp mua là gì; "ai nợ mình, mình nợ ai" thì có.
 *
 * Ở điện thoại là hai cột hẹp chứ không phải bảng cuộn ngang — cùng nguyên tắc
 * với `DataView`: điện thoại không bao giờ cuộn ngang.
 *
 * 🔴 Chỉ hứa đúng cái code chặn (KE_HOACH_GOI_PRO §7): dòng khác nhau giữa hai bên phải gắn `entitlement` có
 * trong bảng quyền lợi của contracts; dòng không gắn là dòng hai bên như nhau. Test giữ hai luật đó.
 */

import { STAFF_LIMIT, type Entitlement } from '@mambo/contracts';
import { FREE_RECEIPTS_PER_MONTH } from '@/config';
import { L } from '@/i18n/labels';

export interface Row {
  readonly what: string;
  readonly free: string;
  readonly paid: string;
  readonly entitlement?: Entitlement;
}

export const ROWS: readonly Row[] = [
  {
    what: L.featureReceipts,
    free: `${FREE_RECEIPTS_PER_MONTH} ${L.featureReceiptsPerMonth}`,
    paid: L.featureReceiptsPaid,
    entitlement: 'receipts:unlimited',
  },
  { what: L.featureSync, free: L.featureSyncFree, paid: L.featureSyncPaid, entitlement: 'sync' },
  {
    what: L.featureStaff,
    free: L.featureStaffFree,
    paid: `${L.featureStaffPaidPrefix} ${STAFF_LIMIT.trader} ${L.featureStaffPaidSuffix}`,
    entitlement: 'members:add',
  },
  { what: L.featurePhotos, free: L.featurePhotosFree, paid: L.featurePhotosPaid, entitlement: 'attachments' },
  { what: L.featureParties, free: L.featurePartiesDetail, paid: L.featurePartiesDetail },
  { what: L.featureDebts, free: L.featureDebtsDetail, paid: L.featureDebtsDetail },
  { what: L.featureExport, free: L.featureYes, paid: L.featureYes },
];

export function PlanComparison() {
  return (
    <dl className="flex flex-col divide-y divide-rule">
      {ROWS.map((row) => (
        <div key={row.what} className="grid grid-cols-2 gap-3 py-3">
          <dt className="col-span-2 text-sm font-bold text-ink">{row.what}</dt>
          <dd className="text-sm text-ink-3">
            <span className="block text-xs font-semibold uppercase tracking-wide">
              {L.planFree}
            </span>
            {row.free}
          </dd>
          <dd className="text-sm text-ink">
            <span className="block text-xs font-semibold uppercase tracking-wide text-brand">
              {L.planPremium}
            </span>
            {row.paid}
          </dd>
        </div>
      ))}
    </dl>
  );
}
