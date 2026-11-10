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
 * Hết dùng thử / hết hạn thì sổ chỉ còn xem — hạn mức 0 phiếu (bảng giá Giai đoạn 1, chốt 10/11/2026). Vì hạn mức
 * là 0, chỉ chặn khi BIẾT CHẮC gói đã hết: xem `knownFree`.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { FREE_RECEIPTS_PER_MONTH, GRACE_DAYS } from '@/config';
import { quotaFor, type QuotaState } from '@mambo/core/receiptQuota';
import { planFor, type PaymentIntent, type PlanState, type Subscription } from '@mambo/core/subscription';
import type { PaymentIntentCreateInput, PlanCode } from '@mambo/contracts';
import { createPaymentIntent, redeemPromoCode, type BillingOffer } from '../billing';
import { isDemoActive } from '../demoMode';
import {
  addPaymentIntent,
  loadSubscription,
  setBillingOffer,
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
  /** Gói vựa đang có (Thương lái / Vựa) — từ `/v1/me`. Doanh nghiệp, dữ liệu mẫu, sổ của máy: null. */
  readonly planCode: PlanCode | null;
  readonly quota: QuotaState;
  readonly subscription: Subscription | null;
  readonly intents: readonly PaymentIntent[];
  readonly loading: boolean;
  /** Hỏi lại máy chủ ngay. Màn chờ chuyển khoản gọi cái này theo nhịp. */
  readonly refresh: () => void;
  /** Tạo ý định thanh toán (mua / gia hạn gói, hoặc mua thêm người cân) và trả về mã đối soát để vẽ QR. */
  readonly startPayment: (input: PaymentIntentCreateInput) => Promise<PaymentIntent>;
  /** Nhập mã Khách hàng sáng lập; thành công thì bảng giá đổi ngay. Lỗi ném ra kèm câu báo của máy chủ. */
  readonly redeemPromo: (code: string) => Promise<void>;
}

const SERVER: SubscriptionSnapshot = { subscription: null, intents: [], offer: null, loading: false };

/**
 * Gói đã hết thật chưa — điều kiện chặn ghi phiếu. Chưa tải được gói (máy mới chưa có bản nhớ, API đang khởi động
 * ~20 giây, mất mạng) thì `subscription` là null và `planFor` ra `free`: chặn lúc đó là người vừa đăng ký dùng thử
 * thấy màn "gói đã hết hạn" ngay phiếu đầu. Nên: chưa có gói thì tin gói của `/v1/me` (nhớ trong máy); chưa có nốt
 * thì không chặn — phần đáng tiền (đồng bộ) máy chủ vẫn chặn.
 */
export const knownFree = (plan: PlanState, subscription: Subscription | null, summaryTier: string | null | undefined): boolean =>
  subscription !== null ? !plan.premium : summaryTier === 'free';

export function useSubscription(): SubscriptionValue {
  const { data, currentOrgId, permissions, bookKey, plan: summary } = useStore();
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
   * Chế độ trình diễn không bị hạn mức: sổ mẫu có sẵn nhiều phiếu, chặn ngay
   * lúc mở ra xem thì cái người xem thấy đầu tiên là màn đòi tiền.
   */
  const quota = quotaFor(data, new Date(), {
    premium: !knownFree(plan, snapshot.subscription, summary?.tier) || isDemoActive(bookKey),
    limit: FREE_RECEIPTS_PER_MONTH,
  });

  const refresh = useCallback(() => {
    void loadSubscription(userId, true, billing);
  }, [userId, billing]);

  const startPayment = useCallback(async (input: PaymentIntentCreateInput) => {
    const intent = await createPaymentIntent(input);
    addPaymentIntent(intent);
    return intent;
  }, []);

  const redeemPromo = useCallback(async (code: string) => {
    setBillingOffer(await redeemPromoCode(code));
  }, []);

  return {
    billingAvailable: snapshot.offer?.selfServe ?? false,
    offer: snapshot.offer,
    plan,
    planCode: summary?.plan ?? null,
    quota,
    subscription: snapshot.subscription,
    intents: snapshot.intents,
    loading: snapshot.loading,
    refresh,
    startPayment,
    redeemPromo,
  };
}
