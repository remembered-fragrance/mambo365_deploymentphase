/**
 * Kích hoạt gói bằng tay khi tiền đã vào mà webhook không nhận ra.
 *
 * 🔴 ĐÂY KHÔNG PHẢI PHƯƠNG ÁN DỰ PHÒNG LÀM SAU. Gõ sai nội dung chuyển khoản là
 * chuyện THƯỜNG XUYÊN với tệp người dùng này — nhiều người nhờ con cháu chuyển
 * hộ, nhiều app ngân hàng tự điền nội dung mặc định đè lên. Không có đường này
 * thì mỗi lần như vậy là một khách đã trả tiền mà không dùng được, tức là vừa
 * mất tiền vừa mất uy tín trong một cộng đồng truyền miệng.
 *
 * ⚠️ TRƯỚC KHI CHẠY — làm đủ, không rút gọn:
 *   1. Mở app ngân hàng, XEM TẬN MẮT giao dịch: số tiền, thời gian, mã giao dịch.
 *   2. Đối chiếu số tiền với bảng giá. Không khớp thì gọi hỏi, không tự đoán.
 *   3. Gọi lại số điện thoại đã đăng ký để xác nhận đúng người đã chuyển.
 *   4. Ghi vào sổ hỗ trợ: ngày giờ, mã giao dịch, ai duyệt.
 *
 * Mã giao dịch ngân hàng là bắt buộc, không phải tuỳ chọn: nó vào bảng
 * `bank_transactions` làm khoá chống trùng, nên nếu sau đó webhook mới về thì
 * cùng giao dịch ấy KHÔNG được cộng thêm một kỳ nữa.
 *
 * Chạy:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     npx tsx scripts/admin-activate.ts 0905112233 149000 FT26081234567
 *
 * Khoá service_role KHÔNG được nằm trong repo — luôn truyền qua biến môi trường.
 */

import { createClient } from '@supabase/supabase-js';
import { MONTHS_PER_PRICE } from '../src/config';
import { extendPeriod } from '../src/core/subscription';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [identifier, amountRaw, bankTxId, operator] = process.argv.slice(2);

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!url || !serviceRoleKey) {
  fail('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong biến môi trường.');
}
if (!identifier || !amountRaw || !bankTxId || !operator) {
  fail(
    'Dùng: admin-activate.ts <sđt|tên tài khoản|email> <số tiền> <mã giao dịch ngân hàng> <tên người duyệt>',
  );
}

const amount = Number.parseInt(amountRaw, 10);
const months = MONTHS_PER_PRICE[amount];
if (!Number.isFinite(amount) || !months) {
  fail(
    `Số tiền ${amountRaw} không khớp bảng giá (${Object.keys(MONTHS_PER_PRICE).join(' hoặc ')}). ` +
      'Gọi hỏi người chuyển, không tự đoán kỳ hạn.',
  );
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const main = async (): Promise<void> => {
  const { data: email, error: resolveError } = await admin.rpc('resolve_identifier', {
    raw: identifier,
  });
  if (resolveError) fail(`Không tra được định danh: ${resolveError.message}`);
  if (!email) fail(`Không có tài khoản nào khớp "${identifier}".`);

  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) fail(`Không đọc được danh sách người dùng: ${listError.message}`);

  const user = list.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
  if (!user) fail(`Tra ra email ${email} nhưng không tìm thấy tài khoản tương ứng.`);

  // Ghi sổ đối soát TRƯỚC — cùng thứ tự với webhook, và cũng cùng lý do: khoá
  // chính của bảng là mã giao dịch, nên chạy lệnh này hai lần không cộng hai kỳ.
  const { error: ledgerError } = await admin.from('bank_transactions').insert({
    bank_tx_id: bankTxId,
    user_id: user.id,
    amount,
    description: `admin-activate ${identifier}`,
    source: 'admin',
  });
  if (ledgerError) {
    fail(`Mã giao dịch ${bankTxId} đã được xử lý rồi (hoặc lỗi ghi sổ: ${ledgerError.message}).`);
  }

  const { data: current } = await admin
    .from('subscriptions')
    .select('id, current_period_end')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  const periodEnd = extendPeriod(current?.current_period_end ?? undefined, new Date(), months);

  const { error: subError } = current
    ? await admin
        .from('subscriptions')
        .update({ status: 'active', current_period_end: periodEnd })
        .eq('id', current.id)
    : await admin.from('subscriptions').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        status: 'active',
        current_period_end: periodEnd,
      });
  if (subError) fail(`Không cập nhật được gói: ${subError.message}`);

  const { error: logError } = await admin.from('admin_access_log').insert({
    user_id: user.id,
    action: 'activate-plan',
    operator,
    reason: `chuyển khoản ${amount} · mã ${bankTxId}`,
  });
  if (logError) console.error(`⚠ Không ghi được nhật ký: ${logError.message}`);

  console.error(
    `✓ Đã mở gói cho ${email} tới ${periodEnd} (+${months} tháng, mã ${bankTxId}), người duyệt: ${operator}.`,
  );
};

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
