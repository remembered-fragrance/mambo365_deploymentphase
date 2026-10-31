/**
 * Miễn phí và trả phí khác nhau chỗ nào — viết bằng lời người dùng.
 *
 * Không phải bảng dấu tích. Mỗi dòng nói RA ĐƯỢC GÌ ở từng bên, vì "Công nợ ✓"
 * không nói cho chủ vựa biết thứ họ sắp mua là gì; "ai nợ mình, mình nợ ai" thì có.
 *
 * Ở điện thoại là hai cột hẹp chứ không phải bảng cuộn ngang — cùng nguyên tắc
 * với `DataView`: điện thoại không bao giờ cuộn ngang.
 *
 * Cột trả phí là gói Vựa. Gói Thương lái (0.28.0) chỉ khác ở vài dòng — dòng đó ghi thêm một câu phụ
 * "Gói Thương lái: …" ngay dưới, thay vì thêm cột thứ ba làm chật màn điện thoại.
 *
 * 🔴 Chỉ hứa đúng cái code chặn (KE_HOACH_GOI_PRO §7): dòng khác nhau giữa hai bên phải gắn `entitlement` có
 * trong bảng quyền lợi của contracts; dòng không gắn là dòng hai bên như nhau. Có câu Thương lái (`solo`) đúng khi
 * quyền lợi đó nằm trong `PLAN_EXCLUDES.thuong_lai`. Test giữ các luật đó.
 */

import { EXTRA_STAFF_MAX, STAFF_INCLUDED, type Entitlement } from '@mambo/contracts';
import { FREE_RECEIPTS_PER_MONTH } from '@/config';
import { L } from '@/i18n/labels';

export interface Row {
  readonly what: string;
  readonly free: string;
  readonly paid: string;
  /** Gói Thương lái khác gói Vựa ở dòng này. Không có = như cột trả phí. */
  readonly solo?: string;
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
    paid: `${STAFF_INCLUDED} ${L.featureStaffPaidMid} ${STAFF_INCLUDED + EXTRA_STAFF_MAX} ${L.featureStaffPaidSuffix}`,
    solo: L.featureStaffSolo,
    entitlement: 'members:add',
  },
  { what: L.featurePhotos, free: L.featurePhotosFree, paid: L.featurePhotosPaid, entitlement: 'attachments' },
  { what: L.featureQuality, free: L.featureQualityFree, paid: L.featureQualityPaid, entitlement: 'quality:pricing' },
  { what: L.featureGreenRatio, free: L.featureGreenRatioFree, paid: L.featureYes, entitlement: 'quality:pricing' },
  {
    what: L.featureRubberKind,
    free: L.featureRubberKindFree,
    paid: L.featureRubberKindPaid,
    entitlement: 'rubber:grades',
  },
  {
    what: L.featureRubberReconcile,
    free: L.featureRubberReconcileFree,
    paid: L.featureRubberReconcilePaid,
    entitlement: 'rubber:reconcile',
  },
  { what: L.featureAnalytics, free: L.featureAnalyticsFree, paid: L.featureAnalyticsPaid, entitlement: 'analytics' },
  { what: L.featureSeason, free: L.featureSeasonFree, paid: L.featureSeasonPaid, entitlement: 'sync' },
  { what: L.featureMapPrices, free: L.featureMapPricesFree, paid: L.featureMapPricesPaid, entitlement: 'map:prices' },
  {
    what: L.featureAudit,
    free: L.featureAuditFree,
    paid: L.featureAuditPaid,
    solo: L.featureAuditFree,
    entitlement: 'audit:view',
  },
  {
    what: L.featureOrgReport,
    free: L.featureOrgReportFree,
    paid: L.featureYes,
    solo: L.featureOrgReportFree,
    entitlement: 'reports:org',
  },
  {
    what: L.featureStatement,
    free: L.featureStatementFree,
    paid: L.featureStatementPaid,
    entitlement: 'debt:statement',
  },
  { what: L.featureTaxLedger, free: L.featureTaxLedgerFree, paid: L.featureTaxLedgerPaid, entitlement: 'tax:docs' },
  { what: L.featurePayTransfer, free: L.featurePayTransferFree, paid: L.featurePayTransferPaid, entitlement: 'pay:qr' },
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
            {row.solo && (
              <span className="mt-1 block text-ink-3">
                {L.featureSoloPrefix} {row.solo}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
