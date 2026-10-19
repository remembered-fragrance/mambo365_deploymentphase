import type { TransactionKind } from '@mambo/core/types';
import { L } from '@/i18n/labels';

/** Bốn bước theo chiều phiếu: phiếu bán thì bước đầu là chọn người MUA — dặn "người bán" là chỉ sai chỗ. */
export const coachSteps = (kind: TransactionKind): readonly string[] => [
  kind === 'sale' ? L.coachStep1Sale : L.coachStep1,
  L.coachStep2,
  L.coachStep3,
  L.coachStep4,
];
