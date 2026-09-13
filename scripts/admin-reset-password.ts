/**
 * Đặt lại mật khẩu cho người dùng CHỈ CÓ SỐ ĐIỆN THOẠI.
 *
 * Người khai email thật tự lấy lại mật khẩu qua Supabase. Người chỉ có SĐT thì
 * không có cách tự động — đây là đường thủ công duy nhất, và nó dùng
 * service_role, tức là bỏ qua toàn bộ RLS. Đọc kỹ phần xác minh bên dưới.
 *
 * ⚠️ QUY TẮC XÁC MINH DANH TÍNH — làm đủ trước khi chạy, không rút gọn:
 *   1. Gọi lại số điện thoại người đó đăng ký (gọi ĐI, không nhận cuộc gọi đến).
 *   2. Hỏi TÊN VỰA đúng như đã lưu trong hồ sơ.
 *   3. Hỏi hai giao dịch gần nhất: tên người bán và số tiền khoảng bao nhiêu.
 *      Sai một trong hai → dừng, không đặt lại.
 *   4. Ghi lại vào sổ hỗ trợ: ngày giờ, số điện thoại, ai xác minh.
 *
 * Vì sao chặt tay: ai đặt lại được mật khẩu là đọc được toàn bộ sổ tiền của
 * người ta. Số điện thoại là thứ dễ giả mạo nhất trong ba câu hỏi trên.
 *
 * Chạy:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     npx tsx scripts/admin-reset-password.ts 0905112233 <mật-khẩu-mới>
 *
 * Khoá service_role KHÔNG được nằm trong repo — luôn truyền qua biến môi trường.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [identifier, newPassword, operator] = process.argv.slice(2);

const MIN_PASSWORD_LENGTH = 6;

// Khai báo dạng function (không phải arrow const) để TypeScript hiểu đây là
// điểm dừng và thu hẹp kiểu ở các dòng sau mỗi lần gọi.
function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!url || !serviceRoleKey) {
  fail('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong biến môi trường.');
}
if (!identifier || !newPassword || !operator) {
  fail('Dùng: admin-reset-password.ts <sđt|tên tài khoản|email> <mật khẩu mới> <tên người duyệt>');
}
if (newPassword.length < MIN_PASSWORD_LENGTH) {
  fail(`Mật khẩu mới phải từ ${MIN_PASSWORD_LENGTH} ký tự.`);
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

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updateError) fail(`Không đặt lại được mật khẩu: ${updateError.message}`);

  // Trang Quyền riêng tư hứa "quản trị viên chỉ truy cập khi người dùng yêu cầu
  // hỗ trợ, có ghi nhận". Dòng dưới đây là chỗ duy nhất biến câu đó thành thật.
  const { error: logError } = await admin.from('admin_access_log').insert({
    user_id: user.id,
    action: 'reset-password',
    operator,
    reason: `yêu cầu qua ${identifier}`,
  });
  if (logError) console.error(`⚠ Không ghi được nhật ký: ${logError.message}`);

  console.error(`✓ Đã đặt lại mật khẩu cho ${email} (id ${user.id}), người duyệt: ${operator}.`);
};

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
