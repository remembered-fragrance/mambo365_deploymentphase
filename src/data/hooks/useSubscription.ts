/**
 * Gói dịch vụ và hạn mức — một hook duy nhất cho cả hai.
 *
 * Chúng đi cùng nhau vì luôn phải trả lời cùng một câu hỏi: "người này có được
 * ghi phiếu tiếp không". Tách ra hai hook thì màn hình phải tự ghép, và ghép
 * sai là chặn nhầm người đã trả tiền.
 *
 * Trạng thái nằm ở `subscriptionStore` chứ không nằm trong hook: gọi hook ở ba
 * màn khác nhau vẫn chỉ là một lượt hỏi máy chủ, và tất cả cùng thấy một câu
 * trả lời.
 *
 * Chưa cấu hình máy chủ (tài khoản của máy này) thì không có gói nào → bậc
 * `free`. Đúng như mô tả gói Free của CP4: một máy, dữ liệu nằm tại máy, tối đa
 * 30 phiếu mỗi tháng.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { FREE_RECEIPTS_PER_MONTH, GRACE_DAYS } from '@/config';
import { quotaFor, type QuotaState } from '@mambo/core/receiptQuota';
import { planFor, type PaymentIntent, type PlanState, type Subscription } from '@mambo/core/subscription';
import { createPaymentIntent, type BillingOffer } from '../billing';
import { isDemoActive } from '../demoMode';
import {
  addPaymentIntent,
  loadSubscription,
  subscribeSubscription,
  subscriptionSnapshot,
  type SubscriptionSnapshot,
} from '../subscriptionStore';
import { useStore } from '../useStore';

export interface SubscriptionValue {
  /** Tự mua được bằng chuyển khoản (vựa). Doanh nghiệp: false — liên hệ để kích hoạt. */
  readonly billingAvailable: boolean;
  /** null khi chưa tải được hoặc người dùng không có `billing:manage`. */
  readonly offer: BillingOffer | null;
  readonly plan: PlanState;
  readonly quota: QuotaState;
  readonly subscription: Subscription | null;
  readonly intents: readonly PaymentIntent[];
  readonly loading: boolean;
  /** Hỏi lại máy chủ ngay. Màn chờ chuyển khoản gọi cái này theo nhịp. */
  readonly refresh: () => void;
  /** Tạo ý định thanh toán (gói 1 hoặc 12 tháng) và trả về mã đối soát để vẽ QR. */
  readonly startPayment: (months: 1 | 12) => Promise<PaymentIntent>;
}

const SERVER: SubscriptionSnapshot = { subscription: null, intents: [], offer: null, loading: false };

export function useSubscription(): SubscriptionValue {
  const { data, currentOrgId, permissions } = useStore();
  const userId = currentOrgId;
  const billing = permissions.includes('billing:manage');

  const snapshot = useSyncExternalStore(
    subscribeSubscription,
    () => subscriptionSnapshot(userId),
    () => SERVER,
  );

  useEffect(() => {
    void loadSubscription(userId, false, billing);
  }, [userId, billing]);

  const plan = planFor(snapshot.subscription, new Date(), GRACE_DAYS);

  /**
   * Chế độ trình diễn không bị hạn mức: sổ mẫu có sẵn hơn 30 phiếu, chặn ngay
   * lúc mở ra xem thì cái người xem thấy đầu tiên là màn đòi tiền.
   */
  const quota = quotaFor(data, new Date(), {
    premium: plan.premium || isDemoActive(),
    limit: FREE_RECEIPTS_PER_MONTH,
  });

  const refresh = useCallback(() => {
    void loadSubscription(userId, true, billing);
  }, [userId, billing]);

  const startPayment = useCallback(async (months: 1 | 12) => {
    const intent = await createPaymentIntent(months);
    addPaymentIntent(intent);
    return intent;
  }, []);

  return {
    billingAvailable: snapshot.offer?.selfServe ?? false,
    offer: snapshot.offer,
    plan,
    quota,
    subscription: snapshot.subscription,
    intents: snapshot.intents,
    loading: snapshot.loading,
    refresh,
    startPayment,
  };
}
