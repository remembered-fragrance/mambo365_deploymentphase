/**
 * Miễn phí và trả phí khác nhau chỗ nào — viết bằng lời người dùng.
 *
 * Không phải bảng dấu tích. Mỗi dòng nói RA ĐƯỢC GÌ ở từng bên, vì "Công nợ ✓"
 * không nói cho chủ vựa biết thứ họ sắp mua là gì; "ai nợ mình, mình nợ ai" thì có.
 *
 * Ở điện thoại là hai cột hẹp chứ không phải bảng cuộn ngang — cùng nguyên tắc
 * với `DataView`: điện thoại không bao giờ cuộn ngang.
 */

import { FREE_RECEIPTS_PER_MONTH } from '@/config';
import { L } from '@/i18n/labels';

interface Row {
  readonly what: string;
  readonly free: string;
  readonly paid: string;
}

const ROWS: readonly Row[] = [
  {
    what: L.featureReceipts,
    free: `${FREE_RECEIPTS_PER_MONTH} ${L.featureReceiptsPerMonth}`,
    paid: L.featureReceiptsPaid,
  },
  { what: L.featureParties, free: L.featurePartiesFree, paid: L.featurePartiesPaid },
  { what: L.featureDebts, free: L.featureDebtsFree, paid: L.featureDebtsPaid },
  { what: L.featureExport, free: L.featureNo, paid: L.featureYes },
  { what: L.featureSync, free: L.featureSyncFree, paid: L.featureSyncPaid },
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
