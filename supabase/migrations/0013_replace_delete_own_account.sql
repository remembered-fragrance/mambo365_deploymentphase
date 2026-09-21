-- 0013 — Thay delete_own_account cascade (A20)
--
-- Hàm cũ xoá auth.users → CASCADE phiếu. Workspace/đơn chung không được đi theo.
-- Client phải gọi POST /api/v1/account/deletion-requests (re-auth).

create or replace function public.delete_own_account()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  raise exception 'DELETE_VIA_API'
    using errcode = 'P0001',
          hint = 'Dùng POST /api/v1/account/deletion-requests sau khi xác thực lại.';
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
-- Giữ grant authenticated để client cũ nhận lỗi rõ, không 404 RPC.
grant execute on function public.delete_own_account() to authenticated;
