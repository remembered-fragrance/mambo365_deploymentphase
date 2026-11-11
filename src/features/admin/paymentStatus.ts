import type { AdminPaymentRow, BankTxOutcome, PaymentIntentStatus } from '@mambo/contracts';
import { L } from '@/i18n/labels';

const OUTCOME: Readonly<Record<BankTxOutcome, string>> = {
  applied: L.adminPayApplied,
  underpaid: L.adminPayUnderpaid,
  no_intent: L.adminPayNoIntent,
  intent_closed: L.adminPayIntentClosed,
};

const INTENT: Readonly<Record<PaymentIntentStatus, string>> = {
  pending: L.adminPayPending,
  paid: L.adminPayPaid,
  expired: L.adminPayExpired,
  failed: L.adminPayFailed,
};

export interface PaymentStatus {
  readonly text: string;
  /** Tiền đã vào mà gói CHƯA mở — khách đã trả tiền đang chờ, người quản trị phải xem. */
  readonly needsAction: boolean;
}

/** Tiền đã vào thì nói theo sổ đối soát (chỉ `applied` là đã gia hạn); chưa vào thì nói theo lần định chuyển khoản. */
export const paymentStatus = (row: AdminPaymentRow): PaymentStatus => {
  if (row.bank) {
    const byHand = row.bank.source === 'admin' ? ` (${L.adminPaymentsByHand})` : '';
    return { text: `${OUTCOME[row.bank.outcome]}${byHand}`, needsAction: row.bank.outcome !== 'applied' };
  }
  return { text: row.intent ? INTENT[row.intent.status] : '—', needsAction: false };
};
