-- 0006 — Lớp dịch định danh đăng nhập
--
-- Đường lùi:
--   revoke execute on function public.resolve_identifier(text) from anon, authenticated;
--   drop function if exists public.resolve_identifier(text);
--
-- Supabase Auth chỉ nhận email hoặc phone làm định danh, và đăng nhập bằng
-- phone kéo theo luồng xác minh SMS — thứ đang tạm hoãn. Vì vậy client gửi một
-- chuỗi duy nhất (tên tài khoản / SĐT / email), hàm này dịch ra email nội bộ,
-- rồi client gọi signInWithPassword bằng email đó.
--
-- Ba chốt bảo mật, thiếu một là thành lỗ hổng:
--   1. Hàm CHỈ trả về email. Không trả tên, SĐT hay bất cứ gì khác.
--   2. security definer + set search_path = public — không để bị lạm quyền.
--   3. Client LUÔN hiện đúng một thông báo "Tài khoản hoặc mật khẩu không đúng",
--      kể cả khi hàm trả NULL. Nếu không, đây thành công cụ dò tài khoản.

create or replace function public.resolve_identifier(raw text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_key   text := lower(trim(coalesce(raw, '')));
  v_phone text;
begin
  if v_key = '' then
    return null;
  end if;

  -- Trông giống số điện thoại thì chuẩn hoá trước khi tra.
  if v_key ~ '^[0-9 .+()-]+$' then
    v_phone := public.normalize_phone(v_key);
  end if;

  select u.email
    into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.deleted_at is null
    and (
      p.username = v_key
      or (v_phone is not null and p.phone = v_phone)
      or lower(u.email) = v_key
      or lower(p.recovery_email::text) = v_key
    )
  limit 1;

  return v_email;
end;
$$;

-- Người chưa đăng nhập cần gọi được hàm này để đăng nhập.
revoke all on function public.resolve_identifier(text) from public;
grant execute on function public.resolve_identifier(text) to anon, authenticated;
