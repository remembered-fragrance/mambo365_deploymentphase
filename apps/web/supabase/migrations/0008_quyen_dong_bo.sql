-- 0008 — Quyền đồng bộ: gắn has_active_sync() vào policy GHI
--
-- Đường lùi:
--   drop trigger if exists profiles_start_trial on public.profiles;
--   drop function if exists public.start_trial();
--   drop table if exists public.bank_transactions;
--   -- rồi chạy lại phần vòng lặp policy của 0005_rls.sql
--
-- Đây là chốt chặn thật của phần thu tiền. Chặn bằng JavaScript là chặn giả:
-- người dùng gọi thẳng REST API bằng anon key là qua. Vì vậy điều kiện "có gói
-- còn hạn" nằm trong policy, không nằm trong app.
--
-- ⭐ HAI QUY TẮC KHÔNG ĐƯỢC ĐỔI
--
--   1. POLICY ĐỌC LUÔN MỞ. Hết hạn gói thì ngừng ĐẨY LÊN, không giữ dữ liệu
--      làm con tin. Vì vậy dưới đây chỉ dựng lại policy insert/update; policy
--      select của 0005 giữ nguyên, không đụng tới.
--   2. Vẫn KHÔNG CÓ policy DELETE. Xoá là xoá mềm qua update deleted_at —
--      thao tác "Hoàn tác" 8 giây của màn Công nợ đi đúng đường update này nên
--      nó được policy "sua cua minh" cho phép (mục treo từ giai đoạn E).
--
-- ⭐ VÌ SAO KHÔNG CÓ TRẠNG THÁI 'grace' / 'expired' TRONG DATABASE
--
-- Kế hoạch F §3.1 gọi tên hai trạng thái đó. Chúng KHÔNG được lưu thành chữ
-- trong cột `status`, mà suy ra từ ngày tháng — ở đây và ở `core/subscription.ts`.
-- Lý do: chữ trong cột chỉ đúng nếu có một tiến trình chạy định kỳ để đổi nó,
-- mà dự án không có cron. Một cột nói 'active' trong khi kỳ đã hết từ tháng
-- trước là thứ nguy hiểm hơn không có cột. Ngày tháng thì luôn tự đúng.
--
--   trialing + trial_ends_at còn hạn                    → đồng bộ được
--   active   + current_period_end còn hạn               → đồng bộ được
--   active   + đã hết hạn nhưng chưa quá 7 ngày (grace) → đồng bộ được, app hiện banner
--   ngoài ra                                            → KHÔNG đẩy lên được

-- ─── Số ngày ân hạn ──────────────────────────────────────────────────────────
-- Trùng với GRACE_DAYS trong src/config.ts. Đổi một chỗ phải đổi cả hai —
-- không có cách nào để một hằng số nằm chung giữa Postgres và trình duyệt.
create or replace function public.sync_grace_days()
returns integer
language sql
immutable
as $$
  select 7;
$$;

create or replace function public.has_active_sync(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.deleted_at is null
      and (
        (s.status = 'trialing' and s.trial_ends_at > now())
        or (
          s.status in ('active', 'past_due')
          and s.current_period_end + make_interval(days => public.sync_grace_days()) > now()
        )
      )
  );
$$;

-- ─── Gói dùng thử sinh ra cùng hồ sơ ─────────────────────────────────────────
-- Không để client tự tạo hàng subscriptions: ai cũng ghi được thì hạn dùng thử
-- là thứ tự đặt. Hàng này do database dựng, id do database sinh — quy ước
-- "id do client sinh" của 0001 chỉ áp cho bảng nghiệp vụ ghi lúc mất mạng.
create or replace function public.start_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (id, user_id, status, trial_ends_at)
  values (
    gen_random_uuid(),
    new.id,
    'trialing',
    now() + interval '30 days'   -- TRIAL_DAYS trong src/config.ts
  )
  on conflict do nothing;
  return new;
end;
$$;

create trigger profiles_start_trial
  after insert on public.profiles
  for each row execute function public.start_trial();

-- ─── Dựng lại policy ghi ─────────────────────────────────────────────────────

-- Tám bảng nghiệp vụ: ghi được khi và chỉ khi gói còn hạn.
do $$
declare
  t text;
begin
  foreach t in array array[
    'suppliers', 'buyers', 'products', 'transactions', 'payments',
    'drafts', 'pricing_rules', 'notes'
  ] loop
    execute format('drop policy if exists "ghi cua minh" on public.%I', t);
    execute format('drop policy if exists "sua cua minh" on public.%I', t);

    execute format(
      'create policy "ghi cua minh khi con goi" on public.%I
       for insert with check (
         auth.uid() = user_id and public.has_active_sync(auth.uid())
       )', t);

    execute format(
      'create policy "sua cua minh khi con goi" on public.%I
       for update using (auth.uid() = user_id)
       with check (auth.uid() = user_id and public.has_active_sync(auth.uid()))', t);
  end loop;
end;
$$;

-- subscriptions: client CHỈ ĐỌC. Ghi khống status = 'active' phải bị từ chối —
-- đó là một trong các tiêu chí nghiệm thu của giai đoạn F.
drop policy if exists "ghi cua minh" on public.subscriptions;
drop policy if exists "sua cua minh" on public.subscriptions;

-- payment_intents: người dùng tự tạo được ý định thanh toán của mình, nhưng
-- chỉ ở trạng thái 'pending'. Đánh dấu 'paid' là việc của Edge Function.
drop policy if exists "ghi cua minh" on public.payment_intents;
drop policy if exists "sua cua minh" on public.payment_intents;

create policy "tao y dinh tra tien cua minh" on public.payment_intents
  for insert with check (auth.uid() = user_id and status = 'pending');

-- `provider_ref` giữ mã 6 ký tự người dùng gõ vào nội dung chuyển khoản. Hai ý
-- định đang chờ mà trùng mã thì webhook không biết cộng tiền cho ai — chặn
-- ngay ở database, không tin vào việc sinh mã ngẫu nhiên là đủ.
create unique index payment_intents_ref_pending
  on public.payment_intents (provider_ref)
  where status = 'pending' and deleted_at is null;

-- ─── Chống trùng webhook ─────────────────────────────────────────────────────
-- Một lần chuyển khoản được gọi về nhiều lần là chuyện bình thường của mọi
-- dịch vụ đọc biến động số dư. Khoá chính CHÍNH LÀ mã giao dịch ngân hàng, nên
-- lần gọi thứ hai vỡ ở tầng database chứ không phụ thuộc vào code webhook nhớ
-- kiểm tra hay không.
create table public.bank_transactions (
  bank_tx_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  payment_intent_id uuid references public.payment_intents(id) on delete set null,
  amount numeric not null,
  description text,
  -- 'webhook' hoặc 'admin' — biết ngay khoản nào vào bằng đường thoát thủ công.
  source text not null default 'webhook',
  created_at timestamptz not null default now()
);

-- Bật RLS mà KHÔNG có policy nào: bảng này chỉ service_role chạm tới.
-- Người dùng không có việc gì phải đọc sổ đối soát của cả hệ thống.
alter table public.bank_transactions enable row level security;
