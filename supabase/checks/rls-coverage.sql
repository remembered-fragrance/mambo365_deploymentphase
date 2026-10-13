-- Kiểm không sót bảng nào thiếu RLS. Chạy MỖI LẦN thêm bảng.
-- Phải trả về 0 dòng.
select tablename
from pg_tables
where schemaname = 'public'
  and not rowsecurity;

-- Kiểm không sót bảng nào thiếu xoá mềm. Phải trả về 0 dòng.
--
-- `bank_transactions` cố tình đứng ngoài: nó là sổ đối soát chỉ ghi thêm, một
-- dòng ở đó nghĩa là "tiền này đã vào rồi". Cho phép xoá mềm nó là mở đúng cái
-- cửa mà bảng này sinh ra để đóng — cộng tiền hai lần cho một lần chuyển khoản.
-- `admin_access_log` cũng đứng ngoài, cùng một lý do: nhật ký mà xoá được —
-- kể cả xoá mềm — thì không còn là nhật ký.
select t.tablename
from pg_tables t
where t.schemaname = 'public'
  and t.tablename not in ('bank_transactions', 'admin_access_log')
  and not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = t.tablename
      and c.column_name = 'deleted_at'
  );

-- Giai đoạn F — mọi bảng nghiệp vụ phải có policy ghi ràng buộc has_active_sync.
-- Phải trả về 0 dòng.
select t.tablename, p.cmd
from pg_tables t
join pg_policies p on p.schemaname = 'public' and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.tablename in (
    'suppliers', 'buyers', 'products', 'transactions', 'payments',
    'drafts', 'pricing_rules', 'notes'
  )
  and p.cmd in ('INSERT', 'UPDATE')
  and coalesce(p.with_check, '') not like '%has_active_sync%';

-- Giai đoạn F — client không được ghi vào subscriptions. Phải trả về 0 dòng.
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'subscriptions'
  and cmd <> 'SELECT';

-- Kiểm định danh linh hoạt: ba cách gõ phải ra CÙNG một email.
select
  public.resolve_identifier('0905112233')      as cach_1,
  public.resolve_identifier('0905 112 233')    as cach_2,
  public.resolve_identifier('+84 905 112 233') as cach_3,
  public.resolve_identifier('khong-ton-tai')   as phai_la_null;
