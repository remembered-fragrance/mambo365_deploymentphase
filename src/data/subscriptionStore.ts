/**
 * Trạng thái gói dùng chung cho cả app — MỘT lượt hỏi máy chủ, nhiều nơi đọc.
 *
 * Hai chuyện bắt hook không tự giữ trạng thái riêng được:
 *
 *   1. Banner trên khung app, thẻ trong Tài khoản và màn tạo phiếu đều cần
 *      cùng một câu trả lời. Mỗi nơi tự hỏi là ba lượt gửi cho một sự thật, mà
 *      người dùng đang ở 3G.
 *   2. 🔴 MẤT MẠNG KHÔNG ĐƯỢC LÀM NGƯỜI ĐÃ TRẢ TIỀN THÀNH NGƯỜI DÙNG MIỄN PHÍ.
 *      Không có bản nhớ trong máy thì một lần hỏi hụt là hạn mức 30 phiếu ập
 *      xuống giữa buổi cân. Vì vậy gói đọc được lần cuối nằm trong máy, và lần
 *      hỏi hỏng thì giữ nguyên bản cũ chứ không hạ bậc.
 *
 * Chiều ngược lại — người hết hạn vẫn giữ được bậc cũ tới khi máy hỏi lại —
 * là cái giá cố ý. Nó chỉ mở phần chặn ở CLIENT (hạn mức phiếu); phần thật sự
 * đáng tiền là đồng bộ, mà cái đó máy chủ chặn bằng `has_active_sync()`.
 */

import type { PaymentIntent, Subscription } from '@/core/subscription';
import { fetchPaymentIntents, fetchSubscription } from './billing';
import { getSupabase } from './client';

const KEY_PREFIX = 'thumua365:plan:';

export interface SubscriptionSnapshot {
  readonly subscription: Subscription | null;
  readonly intents: readonly PaymentIntent[];
  readonly loading: boolean;
}

const EMPTY: SubscriptionSnapshot = { subscription: null, intents: [], loading: false };

let snapshot: SubscriptionSnapshot = EMPTY;
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

const emit = (next: SubscriptionSnapshot): void => {
  snapshot = next;
  for (const listener of listeners) listener();
};

const remember = (userId: string, subscription: Subscription | null): void => {
  try {
    if (subscription) localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(subscription));
    else localStorage.removeItem(KEY_PREFIX + userId);
  } catch {
    // Bộ nhớ đầy hoặc bị chặn — không đáng làm hỏng một lượt đồng bộ.
  }
};

const recall = (userId: string): Subscription | null => {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as Subscription) : null;
  } catch {
    return null;
  }
};

export const subscribeSubscription = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const subscriptionSnapshot = (): SubscriptionSnapshot => snapshot;

/**
 * Đọc lại từ máy chủ. `force` để màn chờ chuyển khoản hỏi theo nhịp; không có
 * nó thì mỗi tài khoản chỉ hỏi một lần cho tới khi đổi tài khoản.
 */
export const loadSubscription = async (userId: string | null, force = false): Promise<void> => {
  const supabase = getSupabase();

  if (!supabase || !userId) {
    loadedFor = null;
    if (snapshot !== EMPTY) emit(EMPTY);
    return;
  }

  if (!force && loadedFor === userId) return;
  loadedFor = userId;

  // Hiện ngay bản nhớ trong máy để không có khoảnh khắc nào người đã trả tiền
  // bị coi là bậc miễn phí trong lúc chờ mạng.
  emit({ subscription: recall(userId), intents: snapshot.intents, loading: true });

  try {
    const [subscription, intents] = await Promise.all([
      fetchSubscription(supabase, userId),
      fetchPaymentIntents(supabase, userId),
    ]);
    remember(userId, subscription);
    emit({ subscription, intents, loading: false });
  } catch {
    // Hỏi hụt thì giữ nguyên bản đang có. Không hạ bậc vì một lần mất sóng.
    emit({ ...snapshot, loading: false });
  }
};

/** Thêm ý định thanh toán vừa tạo vào danh sách đang hiện, chưa cần hỏi lại. */
export const addPaymentIntent = (intent: PaymentIntent): void => {
  emit({ ...snapshot, intents: [intent, ...snapshot.intents] });
};

/** Đăng xuất: bản nhớ của người cũ không được sống sang phiên người mới. */
export const forgetSubscription = (userId: string): void => {
  remember(userId, null);
  loadedFor = null;
  emit(EMPTY);
};
