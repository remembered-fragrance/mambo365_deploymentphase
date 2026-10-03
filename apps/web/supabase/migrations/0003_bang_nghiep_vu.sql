-- 0003 — Bảng nghiệp vụ
--
-- Đường lùi:
--   drop table if exists public.payments, public.notes, public.pricing_rules,
--     public.drafts, public.transactions, public.products, public.buyers,
--     public.suppliers;
--
-- Hai quyết định của giai đoạn B, không nên đổi về sau:
--
--   ⭐ payments là BẢNG RIÊNG, không phải cột JSONB trong transactions.
--      Lý do duy nhất và đủ: recordPayment ghi thêm nhiều lần trong nhiều
--      tháng sau khi phiếu đã chốt. Nếu payments nằm trong hàng transactions
--      thì "ghi sau thắng" sẽ đè cả hàng — hai máy cùng ghi trả nợ là mất tiền
--      âm thầm. Hai dòng INSERT độc lập thì tự hoà vào nhau.
--      Hệ quả: transactions KHÔNG có cột amount_paid. Luôn tính sum(payments).
--
--   ⭐ lines / credit_terms / adjustments giữ JSONB — đúng, vì chúng được đóng
--      băng theo phiếu (freezeLineTotals) và không bao giờ sửa lẻ.

-- ─── Đối tác ─────────────────────────────────────────────────────────────────

create table public.suppliers (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  location text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.buyers (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  location text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ─── Mặt hàng ────────────────────────────────────────────────────────────────

create table public.products (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unit text not null default 'kg',
  formula_type text not null
    check (formula_type in ('standard', 'netAfterTare', 'rubberLatex', 'lossPercent')),
  is_suggested boolean not null default false,
  is_active boolean not null default true,
  crop text check (crop is null or crop in ('rubber', 'cashew', 'coffee', 'pepper')),
  last_price_per_unit numeric,
  "group" text,
  quality_grades text[],
  track_inventory boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ─── Phiếu ───────────────────────────────────────────────────────────────────

create table public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null,
  kind text not null check (kind in ('purchase', 'sale')),
  -- Nguồn sự thật về đối tác: suppliers.id khi mua, buyers.id khi bán.
  -- NULL = Khách lẻ (không có hồ sơ đối tác) — tên vẫn nằm ở supplier_name.
  counterparty_id uuid,
  -- Giữ vì Transaction.supplierId trong core/types.ts đang là BẮT BUỘC
  -- (cần để đọc dữ liệu v1/v2). Mapper ghi thẳng giá trị, không bịa.
  supplier_id text,
  supplier_name text not null,
  lines jsonb not null,
  credit_terms jsonb,
  adjustments jsonb,
  attachment_ids text[],
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index transactions_user_date_idx
  on public.transactions (user_id, date desc) where deleted_at is null;
create index transactions_user_kind_idx
  on public.transactions (user_id, kind) where deleted_at is null;
create index transactions_user_counterparty_idx
  on public.transactions (user_id, counterparty_id) where deleted_at is null;

-- ─── Lần trả tiền — chỉ ghi thêm ─────────────────────────────────────────────

create table public.payments (
  id uuid primary key,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  -- Huỷ một lần trả = xoá mềm. KHÔNG sửa số tiền của lần trả đã ghi.
  deleted_at timestamptz
);

create index payments_transaction_idx
  on public.payments (transaction_id) where deleted_at is null;

-- ─── Nháp ────────────────────────────────────────────────────────────────────

create table public.drafts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'waiting')),
  -- Thiếu cột này chính là lỗi #4 trong báo cáo review bản demo:
  -- nháp phiếu bán hoàn thành ra thành phiếu mua.
  kind text check (kind is null or kind in ('purchase', 'sale')),
  counterparty_id uuid,
  supplier_id text,
  supplier_name text not null default '',
  lines jsonb not null default '[]'::jsonb,
  amount_paid numeric not null default 0,
  note text,
  attachment_ids text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ─── Quy tắc giá ─────────────────────────────────────────────────────────────

create table public.pricing_rules (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('logistics', 'volumeDiscount', 'manual')),
  product_id uuid,
  fixed_amount numeric,
  percent_of_total numeric,
  min_weight_kg numeric,
  applies_on_pickup boolean,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ─── Ghi chú ─────────────────────────────────────────────────────────────────

create table public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ─── Trigger updated_at cho mọi bảng có cột đó ───────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'suppliers', 'buyers', 'products', 'transactions',
    'drafts', 'pricing_rules', 'notes'
  ] loop
    execute format(
      'create trigger %I_touch before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end;
$$;
