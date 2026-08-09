/**
 * Một instance Supabase duy nhất cho cả app.
 *
 * Chưa cấu hình biến môi trường thì trả `null` — app vẫn chạy hoàn toàn bằng
 * bản sao cục bộ. Đây không phải trạng thái lỗi: khi đang cân hàng giữa rẫy,
 * "không có máy chủ" và "không có mạng" là cùng một chuyện, và app phải dùng
 * được trong cả hai.
 *
 * Chỉ `anon key` được đưa vào frontend — nó chịu Row Level Security.
 * `service_role` không bao giờ xuất hiện ở đây.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // "Ghi nhớ đăng nhập" bật sẵn: mục tiêu là chủ vựa gần như không bao giờ
      // phải gõ lại mật khẩu.
      detectSessionInUrl: false,
    },
  });
}

export const getSupabase = (): SupabaseClient | null => client;

/** App có máy chủ để đồng bộ hay đang chạy thuần cục bộ. */
export const hasBackend = (): boolean => client !== null;
