-- 0002 — Hồ sơ người dùng
--
-- Đường lùi:
--   drop trigger if exists profiles_touch on public.profiles;
--   drop table if exists public.profiles;
--
-- Supabase Auth quản lý auth.users. Bảng này chỉ thêm phần THUMUA365 cần:
-- tên vựa, tên đăng nhập, số điện thoại đã chuẩn hoá, email lấy lại mật khẩu.
--
-- L4 — email là TUỲ CHỌN. Phần lớn chủ vựa không có email; họ đăng nhập bằng
-- số điện thoại hoặc tên tài khoản. `auth.users.email` luôn tồn tại nhưng có
-- thể là email nội bộ `+84…@id.thumua365.vn` (tên miền ta sở hữu, không gửi thư).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  -- citext: gõ "VuaBaTam" hay "vuabatam" đều vào một tài khoản
  username citext unique,
  -- luôn ở dạng +84…, xem normalize_phone()
  phone text unique,
  -- email thật người dùng khai thêm, CHỈ dùng để tự lấy lại mật khẩu
  recovery_email citext,
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Chỉ số điện thoại đã chuẩn hoá mới được lưu — chặn ngay ở database,
-- không tin riêng tầng ứng dụng.
alter table public.profiles
  add constraint profiles_phone_normalized
  check (phone is null or phone = public.normalize_phone(phone));
