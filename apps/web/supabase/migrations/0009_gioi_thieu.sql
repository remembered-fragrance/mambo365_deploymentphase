-- 0009 — Mã giới thiệu
--
-- Đường lùi:
--   drop function if exists public.claim_referral(text);
--   drop trigger if exists profiles_referral_code on public.profiles;
--   drop function if exists public.set_referral_code();
--   drop function if exists public.new_referral_code();
--   alter table public.profiles drop column referred_by, drop column referral_code;
--   grant insert, update on public.profiles to authenticated;
--
-- CP4 §10 xếp giới thiệu là kênh tìm khách chính. Phần thưởng để nhóm quyết
-- sau; thứ phải có NGAY là cơ chế ghi nhận — biết ai mời ai. Ghi nhận muộn thì
-- những người đầu tiên, tức những người quý nhất, không bao giờ được tính công.

alter table public.profiles
  add column referral_code citext unique,
  -- Ai mời mình. Ghi đúng một lần, không sửa lại được (xem claim_referral).
  add column referred_by uuid references auth.users(id) on delete set null;

create index profiles_referred_by_idx on public.profiles (referred_by);

-- ─── Sinh mã ─────────────────────────────────────────────────────────────────
-- Bảng chữ bỏ 0/O/1/I/L: mã này được đọc qua điện thoại và chép tay ngoài chợ.
create or replace function public.new_referral_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  candidate text;
begin
  loop
    candidate := '';
    for _ in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.profiles p where p.referral_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

-- Mã do DATABASE đặt, không nhận từ client: để client tự chọn mã là mở đường
-- cho việc chiếm mã dễ đọc của người khác.
create or replace function public.set_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.referral_code := public.new_referral_code();
  new.referred_by := null;
  return new;
end;
$$;

create trigger profiles_referral_code
  before insert on public.profiles
  for each row execute function public.set_referral_code();

-- ─── Ghi nhận lời mời ────────────────────────────────────────────────────────
-- Trả về true khi ghi nhận được. KHÔNG nói vì sao thất bại: hàm này gọi được
-- bằng bất kỳ tài khoản nào, mà "mã này có thật hay không" là thứ đủ để dò ra
-- ai đang dùng app.
create or replace function public.claim_referral(code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  inviter uuid;
  me uuid := auth.uid();
begin
  if me is null or coalesce(trim(code), '') = '' then
    return false;
  end if;

  select p.id into inviter
  from public.profiles p
  where p.referral_code = trim(code)
    and p.deleted_at is null
    and p.id <> me;

  if inviter is null then
    return false;
  end if;

  -- Ghi đúng một lần: `referred_by is null` trong mệnh đề where khiến lần gọi
  -- thứ hai không đổi được người mời. Đổi được thì phần thưởng thành thứ khai
  -- lại mỗi tháng.
  update public.profiles
  set referred_by = inviter
  where id = me and referred_by is null;

  return found;
end;
$$;

revoke all on function public.claim_referral(text) from public;
grant execute on function public.claim_referral(text) to authenticated;

-- ─── Khoá hai cột này khỏi tay client ────────────────────────────────────────
-- Quyền theo cột chỉ có tác dụng khi KHÔNG còn quyền ở mức bảng — quyền mức
-- bảng phủ mọi cột. Vì vậy thu hồi trước rồi cấp lại đúng những cột người dùng
-- có việc phải ghi.
--
-- `phone` không nằm trong danh sách sửa: nó là khoá đăng nhập, đổi số là việc
-- phải xác minh chứ không phải sửa một ô trong form (đã ghi ở data/auth.ts).
revoke insert, update on public.profiles from anon, authenticated;

grant insert (id, name, username, phone, recovery_email, business_name)
  on public.profiles to authenticated;

grant update (name, username, recovery_email, business_name, deleted_at)
  on public.profiles to authenticated;
