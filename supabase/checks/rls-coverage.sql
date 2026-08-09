-- Kiểm không sót bảng nào thiếu RLS. Chạy MỖI LẦN thêm bảng.
-- Phải trả về 0 dòng.
select tablename
from pg_tables
where schemaname = 'public'
  and not rowsecurity;

-- Kiểm không sót bảng nào thiếu xoá mềm. Phải trả về 0 dòng.
select t.tablename
from pg_tables t
where t.schemaname = 'public'
  and not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = t.tablename
      and c.column_name = 'deleted_at'
  );

-- Kiểm định danh linh hoạt: ba cách gõ phải ra CÙNG một email.
select
  public.resolve_identifier('0905112233')      as cach_1,
  public.resolve_identifier('0905 112 233')    as cach_2,
  public.resolve_identifier('+84 905 112 233') as cach_3,
  public.resolve_identifier('khong-ton-tai')   as phai_la_null;
