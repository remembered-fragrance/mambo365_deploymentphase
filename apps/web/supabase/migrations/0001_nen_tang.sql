-- 0001 — Nền tảng: extension và hàm hạ tầng
--
-- Đường lùi:
--   drop function if exists public.normalize_phone(text);
--   drop function if exists public.touch_updated_at();
--   (không drop extension: bảng khác có thể đang dùng)
--
-- Quy ước áp cho MỌI bảng nghiệp vụ trong các migration sau:
--   1. id uuid primary key — CLIENT sinh, không có default gen_random_uuid().
--      Ghi lạc quan khi mất mạng cần biết id ngay, không đợi máy chủ trả về.
--   2. user_id uuid references auth.users(id) not null
--   3. created_at / updated_at timestamptz not null default now() + trigger
--   4. deleted_at timestamptz — XOÁ MỀM. Mọi truy vấn đọc lọc `deleted_at is null`.
--      Không có nó thì phiếu đã xoá sẽ sống dậy khi máy offline đồng bộ lại.

create extension if not exists citext;

-- ─── updated_at tự cập nhật ──────────────────────────────────────────────────
-- Trigger CHỈ làm việc hạ tầng. Không đặt logic nghiệp vụ vào trigger —
-- nghiệp vụ nằm ở src/core/, một chỗ duy nhất.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Chuẩn hoá số điện thoại ─────────────────────────────────────────────────
-- 0905112233 · 0905 112 233 · +84 905 112 233 · 84905112233 → +84905112233
-- Bắt buộc, không phải tuỳ chọn: nếu bỏ qua, cùng một người sẽ vô tình tạo hai
-- tài khoản với hai bộ dữ liệu khác nhau và không hiểu vì sao mất phiếu.
create or replace function public.normalize_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  if raw is null then
    return null;
  end if;

  digits := regexp_replace(raw, '[^0-9+]', '', 'g');
  digits := regexp_replace(digits, '^\+', '', 'g');

  if digits ~ '^84[0-9]{8,10}$' then
    return '+' || digits;
  elsif digits ~ '^0[0-9]{8,10}$' then
    return '+84' || substring(digits from 2);
  end if;

  return null;
end;
$$;
