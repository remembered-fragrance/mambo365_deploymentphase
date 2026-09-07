-- 0010 — Xoá tài khoản thật, và nhật ký khi quản trị viên chạm dữ liệu người dùng
--
-- Đường lùi:
--   revoke execute on function public.delete_own_account() from authenticated;
--   drop function if exists public.delete_own_account();
--   drop table if exists public.admin_access_log;
--
-- Hai thứ ở đây tồn tại vì trang Quyền riêng tư của giai đoạn G HỨA chúng.
-- Luật riêng của G §4.1: không hứa điều hệ thống không làm được. Câu "xoá toàn
-- bộ, kể cả bản sao lưu" và câu "quản trị viên chỉ truy cập khi được yêu cầu,
-- có ghi nhận" chỉ thành thật khi có đúng hai thứ dưới đây.

-- ─── Xoá tài khoản ───────────────────────────────────────────────────────────
--
-- Supabase không có API cho phép người dùng tự xoá tài khoản của mình từ client
-- — `auth.admin.deleteUser` đòi service_role, mà service_role thì không bao giờ
-- được vào bundle. Vì vậy hàm định nghĩa ở đây, chạy dưới quyền chủ schema, và
-- chỉ xoá ĐÚNG hàng của người đang gọi.
--
-- 🔴 XOÁ THẬT, không phải đánh dấu vô hiệu hoá. Mọi bảng nghiệp vụ đều
-- `references auth.users(id) on delete cascade`, nên một lệnh delete ở đây kéo
-- theo toàn bộ phiếu, đối tác, nháp, gói dịch vụ và ý định thanh toán. Xoá mềm
-- ở đây là trái đúng cái chính sách vừa công bố.
--
-- ⚠️ File ảnh trong Storage KHÔNG đi theo cascade — client phải xoá chúng trước
-- khi gọi hàm này (`data/account.ts`). Sau khi tài khoản mất, không ai còn
-- quyền xoá những file đó nữa: policy Storage khớp theo `auth.uid()`.
create or replace function public.delete_own_account()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Chưa đăng nhập';
  end if;

  -- `bank_transactions.user_id` là `on delete set null`, cố ý: sổ đối soát tiền
  -- phải còn nguyên sau khi người dùng đi, nếu không thì xoá tài khoản trở
  -- thành cách dùng lại một mã giao dịch ngân hàng.
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- ─── Nhật ký truy cập của quản trị viên ──────────────────────────────────────
--
-- Chỉ hai script trong `scripts/` ghi vào đây, bằng service_role. Không có
-- policy nào ⇒ người dùng thường không đọc được, và cũng không sửa được.
-- Không có `deleted_at`: nhật ký mà xoá được thì không còn là nhật ký.
create table public.admin_access_log (
  id uuid primary key default gen_random_uuid(),
  -- Không có khoá ngoại tới auth.users: xoá tài khoản KHÔNG được xoá dấu vết
  -- rằng đã từng có người chạm vào dữ liệu của họ.
  user_id uuid,
  -- 'reset-password' · 'activate-plan'
  action text not null,
  -- Ai duyệt và vì sao — nhập tay lúc chạy script, không tự sinh được.
  operator text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index admin_access_log_user_idx on public.admin_access_log (user_id, created_at desc);

alter table public.admin_access_log enable row level security;
