-- 0005 — Row Level Security cho MỌI bảng
--
-- Đường lùi: alter table <X> disable row level security; drop policy … on <X>;
--
-- Cô lập dữ liệu nằm ở tầng database, không ở tầng code. Quên bật đúng một bảng
-- là lộ toàn bộ bảng đó cho mọi người dùng — vì vậy vòng lặp dưới đây chạy trên
-- danh sách bảng, không viết tay từng cái, và migration 0008 có truy vấn kiểm.
--
-- Chưa gắn has_active_sync() vào policy ghi — việc đó thuộc giai đoạn F.

-- profiles: khoá chính CHÍNH LÀ auth.uid()
alter table public.profiles enable row level security;

create policy "doc ho so cua minh" on public.profiles
  for select using (auth.uid() = id);
create policy "tao ho so cua minh" on public.profiles
  for insert with check (auth.uid() = id);
create policy "sua ho so cua minh" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Các bảng còn lại đều có cột user_id, dùng chung một mẫu.
do $$
declare
  t text;
begin
  foreach t in array array[
    'suppliers', 'buyers', 'products', 'transactions', 'payments',
    'drafts', 'pricing_rules', 'notes', 'subscriptions', 'payment_intents'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "doc cua minh" on public.%I
       for select using (auth.uid() = user_id)', t);

    execute format(
      'create policy "ghi cua minh" on public.%I
       for insert with check (auth.uid() = user_id)', t);

    -- Xoá là XOÁ MỀM (đặt deleted_at) nên đi qua UPDATE.
    -- Cố tình KHÔNG có policy DELETE: xoá cứng sẽ làm bản ghi sống dậy khi
    -- một máy offline đồng bộ lại.
    execute format(
      'create policy "sua cua minh" on public.%I
       for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end;
$$;
