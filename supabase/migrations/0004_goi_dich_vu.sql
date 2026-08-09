-- 0004 — Gói dịch vụ và ý định thanh toán
--
-- Đường lùi:
--   drop function if exists public.has_active_sync(uuid);
--   drop table if exists public.payment_intents, public.subscriptions;
--
-- Hai bảng này tạo TRƯỚC giai đoạn F vì chúng ảnh hưởng policy ghi: thêm bảng
-- sau khi đã có dữ liệu thật thì phải sửa policy của mọi bảng nghiệp vụ.
-- Ngoài hai bảng này, KHÔNG tạo bảng cho tính năng của giai đoạn sau.

create table public.subscriptions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  -- Hết hạn dùng thử. Sau mốc này, chưa trả tiền thì rơi về hạn mức miễn phí.
  trial_ends_at timestamptz,
  -- Hết kỳ đã trả tiền.
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index subscriptions_one_per_user
  on public.subscriptions (user_id) where deleted_at is null;

create table public.payment_intents (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric not null check (amount > 0),
  status text not null check (status in ('pending', 'paid', 'failed', 'expired')),
  -- Mã tham chiếu của cổng thanh toán, để đối soát khi webhook về.
  provider text not null,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index payment_intents_user_idx
  on public.payment_intents (user_id, created_at desc) where deleted_at is null;

create trigger subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

create trigger payment_intents_touch
  before update on public.payment_intents
  for each row execute function public.touch_updated_at();

-- ─── Quyền đồng bộ ───────────────────────────────────────────────────────────
-- ⚠️ VIẾT SẴN, CHƯA GẮN vào policy ghi của bảng nghiệp vụ.
-- Gắn ở giai đoạn F. Gắn sớm thì giai đoạn C không ghi được gì vì chưa ai có gói.
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
        or (s.status = 'active' and s.current_period_end > now())
      )
  );
$$;
