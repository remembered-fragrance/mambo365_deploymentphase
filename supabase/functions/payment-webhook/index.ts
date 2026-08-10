/**
 * payment-webhook — nhận biến động số dư từ Casso hoặc SePay và mở gói.
 *
 * ⭐ ĐÂY LÀ NƠI DUY NHẤT TRONG DỰ ÁN DÙNG `service_role`. Nó bỏ qua toàn bộ RLS,
 * nên ba chốt dưới đây không được rút gọn cái nào:
 *
 *   1. XÁC THỰC BÍ MẬT. Thiếu là ai cũng gọi được endpoint này để tự gia hạn
 *      miễn phí. So sánh theo kiểu không đo được thời gian.
 *   2. CHỐNG TRÙNG THEO `bank_tx_id`. Dịch vụ đọc biến động số dư gọi lại nhiều
 *      lần là chuyện bình thường; ghi dòng vào `bank_transactions` TRƯỚC khi
 *      gia hạn, và khoá chính của bảng đó chính là mã giao dịch ngân hàng.
 *      Thứ tự này có chủ ý: hỏng giữa chừng thì thành "tiền đã ghi, gói chưa
 *      mở" — sửa bằng `scripts/admin-activate.ts` trong một phút. Thứ tự ngược
 *      lại thì thành cộng tiền hai lần, mà cái đó không ai phát hiện ra.
 *   3. KHỚP SỐ TIỀN. Chuyển thiếu thì không mở gói, để lại cho đường thủ công.
 *
 * Hàm dò mã và hàm cộng kỳ hạn nạp thẳng từ `src/core/` — đúng một bản cho cả
 * trình duyệt lẫn Deno. Hai file đó không import gì nên chạy được ở cả hai nơi;
 * giữ nguyên tính chất đó khi sửa chúng.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MONTHS_PER_PRICE } from '../../../src/config.ts';
import { extendPeriod } from '../../../src/core/subscription.ts';
import { findTransferCode } from '../../../src/core/transferCode.ts';

interface BankTx {
  readonly bankTxId: string;
  readonly amount: number;
  readonly description: string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' ? value : NaN);

/**
 * Casso gửi `{ data: [...] }`, SePay gửi một giao dịch phẳng. Đọc được cả hai
 * để đổi nhà cung cấp không phải sửa phần còn lại của hàm.
 */
const readTransactions = (body: unknown): BankTx[] => {
  const root = (body ?? {}) as Record<string, unknown>;
  const list = Array.isArray(root.data) ? root.data : [root];

  return list
    .map((raw) => {
      const tx = (raw ?? {}) as Record<string, unknown>;
      return {
        bankTxId: text(tx.tid) || text(tx.id) || text(tx.referenceCode),
        amount: Number.isNaN(num(tx.amount)) ? num(tx.transferAmount) : num(tx.amount),
        description: text(tx.description) || text(tx.content),
      };
    })
    .filter((tx) => tx.bankTxId !== '' && Number.isFinite(tx.amount) && tx.amount > 0);
};

/** So sánh không đo được thời gian — tránh dò bí mật bằng cách đo độ trễ. */
const secretMatches = (given: string, expected: string): boolean => {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
};

const authorized = (request: Request, secret: string): boolean => {
  const token =
    request.headers.get('secure-token') ??
    request.headers.get('authorization')?.replace(/^Apikey\s+/i, '') ??
    '';
  return token !== '' && secretMatches(token, secret);
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return json(405, { error: 'method' });

  const secret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? '';
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!secret || !url || !serviceRoleKey) return json(500, { error: 'config' });

  if (!authorized(request, secret)) return json(401, { error: 'unauthorized' });

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const transactions = readTransactions(await request.json().catch(() => null));
  const handled: string[] = [];
  const skipped: string[] = [];

  for (const tx of transactions) {
    const code = findTransferCode(tx.description);
    if (!code) {
      skipped.push(tx.bankTxId);
      continue;
    }

    const { data: intent } = await admin
      .from('payment_intents')
      .select('id, user_id, amount, subscription_id')
      .eq('provider_ref', code)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .maybeSingle();

    // Chuyển thiếu tiền cũng để lại cho đường thủ công: cộng nửa kỳ hạn là thứ
    // không giải thích được, mà từ chối thẳng thì người dùng gọi Zalo ngay.
    if (!intent || tx.amount < intent.amount) {
      skipped.push(tx.bankTxId);
      continue;
    }

    // Chốt chống trùng. Trùng khoá → lần gọi này đã xử lý rồi, bỏ qua im lặng.
    const { error: ledgerError } = await admin.from('bank_transactions').insert({
      bank_tx_id: tx.bankTxId,
      user_id: intent.user_id,
      payment_intent_id: intent.id,
      amount: tx.amount,
      description: tx.description,
      source: 'webhook',
    });
    if (ledgerError) {
      skipped.push(tx.bankTxId);
      continue;
    }

    const { data: current } = await admin
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('user_id', intent.user_id)
      .is('deleted_at', null)
      .maybeSingle();

    const months = MONTHS_PER_PRICE[intent.amount] ?? 1;
    const periodEnd = extendPeriod(current?.current_period_end ?? undefined, new Date(), months);

    // Bình thường trigger `profiles_start_trial` đã dựng sẵn hàng gói. Vẫn dựng
    // lại nếu thiếu: tới đây là tiền đã vào và đã ghi sổ đối soát, không được
    // phép có nhánh nào kết thúc mà gói vẫn chưa mở.
    const { error: subError } = current
      ? await admin
          .from('subscriptions')
          .update({ status: 'active', current_period_end: periodEnd })
          .eq('id', current.id)
      : await admin.from('subscriptions').insert({
          id: crypto.randomUUID(),
          user_id: intent.user_id,
          status: 'active',
          current_period_end: periodEnd,
        });

    if (subError) return json(500, { error: 'subscription', detail: subError.message });

    await admin.from('payment_intents').update({ status: 'paid' }).eq('id', intent.id);
    handled.push(tx.bankTxId);
  }

  return json(200, { handled, skipped });
});
