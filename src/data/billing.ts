/**
 * Đọc gói dịch vụ và tạo ý định thanh toán.
 *
 * Tầng này CHỈ ĐỌC phần trạng thái gói. Không có hàm nào ở đây kích hoạt gói
 * hay gia hạn được: việc đó do Edge Function `payment-webhook` làm bằng
 * `service_role`, và policy của migration 0008 không cho client ghi vào
 * `subscriptions`. Nếu một ngày có ai thêm hàm "activate" vào file này thì toàn
 * bộ phần thu tiền thành thứ ai cũng tự làm được cho mình.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { newId } from '@/core/id';
import type {
  PaymentIntent,
  PaymentIntentStatus,
  Subscription,
  SubscriptionStatus,
} from '@/core/subscription';
import { newTransferCode } from '@/core/transferCode';
import type { PaymentIntentRow, SubscriptionRow } from './rows';

const STATUSES: readonly SubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled'];
const INTENT_STATUSES: readonly PaymentIntentStatus[] = ['pending', 'paid', 'failed', 'expired'];

const subscriptionFromRow = (row: SubscriptionRow): Subscription => ({
  id: row.id,
  // Trạng thái lạ đọc thành 'canceled': thà mất quyền đồng bộ (đọc và xuất file
  // vẫn chạy) còn hơn mở quyền vì một chuỗi không hiểu được.
  status: STATUSES.includes(row.status as SubscriptionStatus)
    ? (row.status as SubscriptionStatus)
    : 'canceled',
  trialEndsAt: row.trial_ends_at ?? undefined,
  currentPeriodEnd: row.current_period_end ?? undefined,
});

const intentFromRow = (row: PaymentIntentRow): PaymentIntent => ({
  id: row.id,
  amount: row.amount,
  status: INTENT_STATUSES.includes(row.status as PaymentIntentStatus)
    ? (row.status as PaymentIntentStatus)
    : 'failed',
  code: row.provider_ref ?? '',
  createdAt: row.created_at,
});

export const fetchSubscription = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? subscriptionFromRow(data as unknown as SubscriptionRow) : null;
};

/** Lịch sử thanh toán hiện trong màn Tài khoản. Mới nhất trước. */
export const fetchPaymentIntents = async (
  supabase: SupabaseClient,
  userId: string,
  limit = 12,
): Promise<PaymentIntent[]> => {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as unknown as PaymentIntentRow[]).map(intentFromRow);
};

/** Postgres báo trùng khoá — ở đây nghĩa là mã 6 ký tự đụng một mã đang chờ. */
const isDuplicate = (code: string | undefined): boolean => code === '23505';

/**
 * Tạo ý định thanh toán và sinh mã đối soát.
 *
 * Thử lại khi trùng mã thay vì báo lỗi: 31⁶ ≈ 887 triệu tổ hợp nên trùng là
 * chuyện hiếm, nhưng "hiếm" gặp lúc người dùng đang muốn trả tiền thì vẫn là
 * mất một khách. Chỉ số duy nhất trong database mới là thứ bảo đảm không trùng
 * — vòng lặp này chỉ là cách xử lý khi nó lên tiếng.
 */
export const createPaymentIntent = async (
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string | null,
  amount: number,
): Promise<PaymentIntent> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = {
      id: newId(),
      user_id: userId,
      subscription_id: subscriptionId,
      amount,
      status: 'pending',
      provider: 'vietqr',
      provider_ref: newTransferCode(),
    };

    const { data, error } = await supabase.from('payment_intents').insert(row).select().single();
    if (!error) return intentFromRow(data as unknown as PaymentIntentRow);
    if (!isDuplicate(error.code)) throw new Error(error.message);
  }
  throw new Error('Không sinh được mã chuyển khoản, thử lại sau ít phút');
};

/**
 * Ghi nhận người mời. Trả `false` khi mã không dùng được — hàm RPC cố ý không
 * nói vì sao, để màn đăng ký không thành công cụ dò xem mã nào có thật.
 */
export const claimReferral = async (
  supabase: SupabaseClient,
  code: string,
): Promise<boolean> => {
  const { data, error } = await supabase.rpc('claim_referral', { code });
  if (error) return false;
  return data === true;
};
