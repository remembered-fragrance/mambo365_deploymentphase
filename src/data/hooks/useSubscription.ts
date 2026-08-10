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
import { quotaFor, type QuotaState } from '@/core/receiptQuota';
import { planFor, type PaymentIntent, type PlanState, type Subscription } from '@/core/subscription';
import { createPaymentIntent } from '../billing';
import { getSupabase } from '../client';
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
  readonly plan: PlanState;
  readonly quota: QuotaState;
  readonly subscription: Subscription | null;
  readonly intents: readonly PaymentIntent[];
  readonly loading: boolean;
  /** Hỏi lại máy chủ ngay. Màn chờ chuyển khoản gọi cái này theo nhịp. */
  readonly refresh: () => void;
  /** Tạo ý định thanh toán mới và trả về mã đối soát để vẽ QR. */
  readonly startPayment: (amount: number) => Promise<PaymentIntent>;
}

const SERVER: SubscriptionSnapshot = { subscription: null, intents: [], loading: false };

export function useSubscription(): SubscriptionValue {
  const { data, user } = useStore();
  const userId = user?.id ?? null;

  const snapshot = useSyncExternalStore(
    subscribeSubscription,
    subscriptionSnapshot,
    () => SERVER,
  );

  useEffect(() => {
    void loadSubscription(userId);
  }, [userId]);

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
    void loadSubscription(userId, true);
  }, [userId]);

  const startPayment = useCallback(
    async (amount: number) => {
      const supabase = getSupabase();
      if (!supabase || !userId) throw new Error('Chưa cấu hình máy chủ');

      const intent = await createPaymentIntent(
        supabase,
        userId,
        snapshot.subscription?.id ?? null,
        amount,
      );
      addPaymentIntent(intent);
      return intent;
    },
    [userId, snapshot.subscription],
  );

  return {
    plan,
    quota,
    subscription: snapshot.subscription,
    intents: snapshot.intents,
    loading: snapshot.loading,
    refresh,
    startPayment,
  };
}
