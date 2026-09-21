-- 0011 — Nền tảng P0: workspace, bản đồ PostGIS, đơn hai bên, tiền/kho, sync
--
-- Nguồn sự thật schema ứng dụng mới (ADR-004). Không drizzle-kit push.
-- Đường lùi: xem cuối file. KHÔNG chạy lên production trong lượt triển khai này.
--
-- Quy ước mới (khác 0001–0010):
--   * Tenant = workspace_id, không phải user_id.
--   * Không ON DELETE CASCADE từ auth.users tới chứng từ giao dịch chung.
--   * Bảng ledger/audit/outbox append-only.
--   * Kết nối NestJS: SET LOCAL app.actor_id / app.workspace_id (ADR-003).

create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ─── Context NestJS (không dùng auth.uid() trên pool SQL) ────────────────────
create or replace function public.app_actor_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.actor_id', true), '')::uuid;
$$;

create or replace function public.app_workspace_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.workspace_id', true), '')::uuid;
$$;

create or replace function public.app_is_platform()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('app.is_platform', true), '') in ('1', 'true');
$$;

-- ─── profiles: cột vòng đời, không đánh dấu verified cho TK cũ ───────────────
alter table public.profiles
  add column if not exists phone_verified_at timestamptz,
  add column if not exists email_verified_at timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists locale text not null default 'vi';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('active', 'disabled', 'pending_deletion', 'deleted'));
  end if;
end $$;

-- ─── Identity ────────────────────────────────────────────────────────────────
create table public.identity_verifications (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete restrict,
  kind text not null check (kind in ('phone_otp', 'email', 'org_docs')),
  status text not null check (status in ('pending', 'verified', 'rejected', 'expired')),
  evidence_file_id uuid,
  expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_mode text,
  default_weight_unit text not null default 'kg' check (default_weight_unit in ('kg', 'hg')),
  quiet_hours jsonb,
  locale text not null default 'vi',
  last_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete restrict,
  device_id text not null,
  platform text not null check (platform in ('web', 'android')),
  app_version text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create table public.deletion_requests (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'rejected')),
  reason text,
  deadline_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null
);

create index deletion_requests_user_idx on public.deletion_requests (user_id, created_at desc);

-- ─── Access ──────────────────────────────────────────────────────────────────
create table public.permissions (
  code text primary key,
  description text not null
);

create table public.roles (
  id uuid primary key,
  workspace_id uuid,
  code text not null,
  name_vi text not null,
  is_system boolean not null default false,
  unique (workspace_id, code)
);

create unique index roles_system_code_uidx
  on public.roles (code)
  where workspace_id is null;

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_code text not null references public.permissions (code),
  primary key (role_id, permission_code)
);

create table public.workspaces (
  id uuid primary key,
  code citext not null unique,
  kind text not null check (kind in ('personal_farm', 'trader', 'enterprise')),
  name text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  deleted_at timestamptz
);

create index workspaces_kind_status_idx on public.workspaces (kind, status);

create table public.memberships (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  user_id uuid not null references auth.users (id) on delete restrict,
  role_id uuid not null references public.roles (id),
  status text not null check (status in ('invited', 'active', 'revoked')),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  unique (workspace_id, user_id),
  unique (id, workspace_id)
);

create index memberships_user_idx on public.memberships (user_id) where status = 'active';

create table public.membership_scopes (
  id uuid primary key,
  membership_id uuid not null,
  workspace_id uuid not null,
  scope_type text not null check (scope_type in ('branch', 'warehouse')),
  scope_id uuid not null,
  unique (membership_id, scope_type, scope_id),
  foreign key (membership_id, workspace_id)
    references public.memberships (id, workspace_id)
);

create table public.invitations (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  email_or_phone text not null,
  role_id uuid not null references public.roles (id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid not null,
  created_at timestamptz not null default now()
);

-- ─── Business parties ────────────────────────────────────────────────────────
create table public.business_parties (
  id uuid primary key,
  workspace_id uuid not null unique references public.workspaces (id),
  display_name text not null,
  legal_name text,
  tax_code text,
  kind text not null check (kind in ('farmer', 'trader', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.farmer_profiles (
  party_id uuid primary key references public.business_parties (id),
  household_size int,
  primary_crops text[]
);

create table public.trader_profiles (
  party_id uuid primary key references public.business_parties (id),
  trade_name text not null,
  legacy_user_id uuid
);

create table public.enterprise_profiles (
  party_id uuid primary key references public.business_parties (id),
  registration_no text
);

create table public.contacts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  kind text not null check (kind in ('supplier', 'buyer', 'both')),
  name text not null,
  phone text,
  location_text text,
  note text,
  linked_party_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  deleted_at timestamptz,
  unique (id, workspace_id)
);

create index contacts_ws_name_idx on public.contacts (workspace_id, name);

create table public.contact_links (
  id uuid primary key,
  contact_id uuid not null,
  workspace_id uuid not null,
  party_id uuid not null references public.business_parties (id),
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  accepted_at timestamptz,
  foreign key (contact_id, workspace_id)
    references public.contacts (id, workspace_id)
);

-- ─── Catalog ─────────────────────────────────────────────────────────────────
create table public.commodities (
  id uuid primary key,
  code text not null unique,
  name_vi text not null,
  crop text not null check (crop in ('rubber', 'cashew', 'coffee', 'pepper', 'other'))
);

create table public.grades (
  id uuid primary key,
  commodity_id uuid not null references public.commodities (id),
  code text not null,
  name text not null,
  unique (commodity_id, code)
);

create table public.units (
  code text primary key,
  to_kg numeric(18, 6) not null check (to_kg > 0)
);

create table public.workspace_products (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  commodity_id uuid references public.commodities (id),
  local_name text not null,
  formula_type text not null
    check (formula_type in ('standard', 'netAfterTare', 'rubberLatex', 'lossPercent')),
  track_inventory boolean,
  legacy_product_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, workspace_id)
);

-- ─── Farms / lots ────────────────────────────────────────────────────────────
create table public.farms (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  name text not null,
  address_text text,
  geog geography(point, 4326),
  geo_visibility text not null default 'hidden'
    check (geo_visibility in ('hidden', 'approximate', 'exact_to_counterparty', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  deleted_at timestamptz,
  unique (id, workspace_id)
);

create table public.harvest_lots (
  id uuid primary key,
  farm_id uuid not null,
  workspace_id uuid not null,
  commodity_id uuid not null references public.commodities (id),
  grade_id uuid references public.grades (id),
  estimated_qty numeric(18, 3) not null default 0 check (estimated_qty >= 0),
  harvested_qty numeric(18, 3) not null default 0 check (harvested_qty >= 0),
  reserved_qty numeric(18, 3) not null default 0 check (reserved_qty >= 0),
  delivered_qty numeric(18, 3) not null default 0 check (delivered_qty >= 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  check (reserved_qty + delivered_qty <= harvested_qty),
  unique (id, workspace_id),
  foreign key (farm_id, workspace_id) references public.farms (id, workspace_id)
);

-- ─── Locations ───────────────────────────────────────────────────────────────
create table public.branches (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.locations (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  branch_id uuid,
  type text not null
    check (type in ('procurement_point', 'warehouse', 'delivery', 'farm_gate')),
  name text not null,
  address_text text not null,
  address_normalized text,
  admin_area_version int,
  geog geography(point, 4326),
  public_contact_name text,
  public_phone text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'pending_review', 'published', 'rejected', 'suspended', 'closed')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  deleted_at timestamptz,
  check (publish_status <> 'published' or geog is not null),
  unique (id, workspace_id),
  foreign key (branch_id, workspace_id) references public.branches (id, workspace_id)
);

create index locations_geog_gix on public.locations using gist (geog);
create index locations_publish_idx on public.locations (publish_status) where deleted_at is null;

create table public.location_hours (
  id uuid primary key,
  location_id uuid not null,
  workspace_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time,
  close_time time,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  is_closed boolean not null default false,
  unique (location_id, weekday),
  foreign key (location_id, workspace_id) references public.locations (id, workspace_id)
);

create table public.location_hour_overrides (
  id uuid primary key,
  location_id uuid not null,
  workspace_id uuid not null,
  on_date date not null,
  is_closed boolean not null default true,
  open_time time,
  close_time time,
  unique (location_id, on_date),
  foreign key (location_id, workspace_id) references public.locations (id, workspace_id)
);

create table public.procurement_capabilities (
  id uuid primary key,
  location_id uuid not null,
  workspace_id uuid not null,
  commodity_id uuid not null references public.commodities (id),
  grade_id uuid references public.grades (id),
  min_qty numeric(18, 3),
  max_qty numeric(18, 3),
  pickup_available boolean not null default false,
  unique (location_id, commodity_id, grade_id),
  foreign key (location_id, workspace_id) references public.locations (id, workspace_id)
);

create table public.price_quotes (
  id uuid primary key,
  location_id uuid not null,
  workspace_id uuid not null,
  commodity_id uuid not null references public.commodities (id),
  grade_id uuid references public.grades (id),
  unit text not null default 'kg' references public.units (code),
  price numeric(18, 2) not null check (price >= 0),
  price_kind text not null check (price_kind in ('reference', 'conditional_commit')),
  valid_from timestamptz not null,
  valid_to timestamptz,
  conditions jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  check (valid_to is null or valid_to > valid_from),
  foreign key (location_id, workspace_id) references public.locations (id, workspace_id)
);

create index price_quotes_loc_idx
  on public.price_quotes (location_id, commodity_id, valid_from desc);

-- ─── Marketplace ─────────────────────────────────────────────────────────────
create table public.sell_listings (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  harvest_lot_id uuid,
  commodity_id uuid not null references public.commodities (id),
  qty numeric(18, 3) not null check (qty > 0),
  unit text not null default 'kg' references public.units (code),
  desired_price numeric(18, 2),
  negotiable boolean not null default true,
  window_start timestamptz,
  window_end timestamptz,
  delivery_mode text not null check (delivery_mode in ('pickup', 'dropoff', 'either')),
  location_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'fulfilled', 'expired', 'cancelled')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  deleted_at timestamptz,
  unique (id, workspace_id),
  foreign key (harvest_lot_id, workspace_id) references public.harvest_lots (id, workspace_id)
);

create table public.buy_requests (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  commodity_id uuid not null references public.commodities (id),
  qty numeric(18, 3) not null check (qty > 0),
  unit text not null default 'kg' references public.units (code),
  target_price numeric(18, 2),
  location_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'fulfilled', 'expired', 'cancelled')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  deleted_at timestamptz,
  unique (id, workspace_id)
);

create table public.listing_media (
  id uuid primary key,
  listing_id uuid not null,
  workspace_id uuid not null,
  file_id uuid not null,
  foreign key (listing_id, workspace_id) references public.sell_listings (id, workspace_id)
);

create table public.follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  location_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, location_id)
);

-- ─── Quotations ──────────────────────────────────────────────────────────────
create table public.quotations (
  id uuid primary key,
  listing_id uuid,
  buy_request_id uuid,
  from_party_id uuid not null references public.business_parties (id),
  to_party_id uuid not null references public.business_parties (id),
  current_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  check (from_party_id <> to_party_id)
);

create table public.quotation_revisions (
  id uuid primary key,
  quotation_id uuid not null references public.quotations (id),
  revision_no int not null check (revision_no >= 1),
  status text not null
    check (status in ('draft', 'sent', 'countered', 'accepted', 'rejected', 'expired', 'withdrawn')),
  expires_at timestamptz,
  payload_hash text,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (quotation_id, revision_no)
);

alter table public.quotations
  add constraint quotations_current_revision_fk
  foreign key (current_revision_id) references public.quotation_revisions (id)
  deferrable initially deferred;

create table public.quotation_lines (
  id uuid primary key,
  revision_id uuid not null references public.quotation_revisions (id),
  commodity_id uuid not null references public.commodities (id),
  grade_id uuid references public.grades (id),
  qty numeric(18, 3) not null check (qty > 0),
  unit text not null default 'kg',
  unit_price numeric(18, 2) not null check (unit_price >= 0),
  formula_type text not null default 'standard'
    check (formula_type in ('standard', 'netAfterTare', 'rubberLatex', 'lossPercent')),
  formula_inputs jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb
);

-- ─── Orders ──────────────────────────────────────────────────────────────────
create table public.document_sequences (
  workspace_id uuid not null references public.workspaces (id),
  book_year int not null,
  kind text not null,
  last_value bigint not null default 0,
  primary key (workspace_id, book_year, kind)
);

create table public.trade_orders (
  id uuid primary key,
  status text not null
    check (status in ('draft', 'pending_acceptance', 'confirmed', 'in_fulfillment', 'completed', 'cancelled')),
  source_quotation_revision_id uuid references public.quotation_revisions (id),
  buyer_party_id uuid not null references public.business_parties (id),
  seller_party_id uuid not null references public.business_parties (id),
  issuer_workspace_id uuid not null references public.workspaces (id),
  confirmed_at timestamptz,
  completed_at timestamptz,
  document_no text,
  temp_document_no text,
  terms_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  check (buyer_party_id <> seller_party_id),
  unique (issuer_workspace_id, document_no)
);

create table public.order_lines (
  id uuid primary key,
  order_id uuid not null references public.trade_orders (id),
  commodity_id uuid not null,
  grade_id uuid,
  qty numeric(18, 3) not null check (qty > 0),
  unit text not null,
  unit_price numeric(18, 2) not null,
  formula_type text not null,
  formula_inputs jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  line_total numeric(18, 0) not null
);

create table public.order_participants (
  order_id uuid not null references public.trade_orders (id),
  party_id uuid not null references public.business_parties (id),
  workspace_id uuid not null references public.workspaces (id),
  side text not null check (side in ('buyer', 'seller')),
  primary key (order_id, side),
  unique (order_id, party_id)
);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.trade_orders (id),
  actor_id uuid,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create table public.workspace_order_views (
  workspace_id uuid not null references public.workspaces (id),
  order_id uuid not null references public.trade_orders (id),
  direction text not null check (direction in ('inbound', 'outbound')),
  internal_status text,
  seller_cost numeric(18, 2),
  primary key (workspace_id, order_id)
);

create table public.internal_notes (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  order_id uuid not null references public.trade_orders (id),
  body text not null,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table public.approval_requests (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  resource_type text not null,
  resource_id uuid not null,
  revision int not null default 1,
  amount numeric(18, 0) not null,
  requester_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revoked')),
  created_at timestamptz not null default now()
);

create table public.approval_actions (
  id uuid primary key,
  request_id uuid not null references public.approval_requests (id),
  actor_id uuid not null,
  action text not null check (action in ('approve', 'reject', 'revoke')),
  at timestamptz not null default now()
);

-- ─── Appointments / receiving ────────────────────────────────────────────────
create table public.appointments (
  id uuid primary key,
  order_id uuid not null references public.trade_orders (id),
  location_id uuid not null,
  proposed_at timestamptz not null,
  status text not null
    check (status in ('proposed', 'confirmed', 'rescheduled', 'checked_in', 'completed', 'cancelled', 'no_show', 'superseded')),
  superseded_by uuid,
  counter_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1
);

create table public.fulfillments (
  id uuid primary key,
  order_id uuid not null references public.trade_orders (id),
  appointment_id uuid references public.appointments (id),
  sequence int not null,
  expected_qty numeric(18, 3) not null check (expected_qty > 0),
  status text not null
    check (status in ('expected', 'weighed', 'qc', 'accepted', 'partially_accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  version int not null default 1,
  unique (order_id, sequence)
);

create table public.weighing_records (
  id uuid primary key,
  fulfillment_id uuid not null references public.fulfillments (id),
  gross_weight numeric(18, 3) not null,
  tare_weight numeric(18, 3) not null default 0,
  formula_type text not null,
  formula_inputs jsonb not null default '{}'::jsonb,
  physical_qty numeric(18, 3) not null,
  payable_qty numeric(18, 3) not null,
  device_recorded_at timestamptz,
  server_received_at timestamptz not null default now(),
  created_by uuid
);

create table public.quality_checks (
  id uuid primary key,
  fulfillment_id uuid not null references public.fulfillments (id),
  grade_proposed_id uuid,
  grade_accepted_id uuid,
  reason text,
  accepted_by_seller boolean,
  accepted_by_buyer boolean,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table public.acceptance_records (
  id uuid primary key,
  fulfillment_id uuid not null references public.fulfillments (id),
  qty_accepted numeric(18, 3) not null check (qty_accepted >= 0),
  qty_rejected numeric(18, 3) not null default 0 check (qty_rejected >= 0),
  reason text,
  posted boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- ─── Inventory ───────────────────────────────────────────────────────────────
create table public.warehouses (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  location_id uuid,
  name text not null,
  unique (id, workspace_id),
  foreign key (location_id, workspace_id) references public.locations (id, workspace_id)
);

create table public.inventory_lots (
  id uuid primary key,
  warehouse_id uuid not null,
  workspace_id uuid not null,
  commodity_id uuid not null references public.commodities (id),
  grade_id uuid,
  qty_on_hand numeric(18, 3) not null default 0 check (qty_on_hand >= 0),
  qty_reserved numeric(18, 3) not null default 0 check (qty_reserved >= 0),
  origin text not null check (origin in ('harvest', 'purchase', 'legacy_opening')),
  legacy_product_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  check (qty_on_hand >= qty_reserved),
  unique (id, workspace_id),
  foreign key (warehouse_id, workspace_id) references public.warehouses (id, workspace_id)
);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  lot_id uuid not null,
  workspace_id uuid not null,
  qty numeric(18, 3) not null,
  reason text not null check (reason in ('receive', 'ship', 'adjust', 'reverse')),
  fulfillment_id uuid,
  actor_id uuid,
  at timestamptz not null default now(),
  foreign key (lot_id, workspace_id) references public.inventory_lots (id, workspace_id)
);

create table public.stock_reservations (
  id uuid primary key,
  lot_id uuid,
  harvest_lot_id uuid,
  workspace_id uuid not null,
  order_id uuid references public.trade_orders (id),
  qty numeric(18, 3) not null check (qty > 0),
  status text not null check (status in ('active', 'released', 'consumed', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (lot_id is not null or harvest_lot_id is not null)
);

-- ─── Settlements ─────────────────────────────────────────────────────────────
create table public.receivable_payable_entries (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  contact_id uuid,
  party_id uuid,
  side text not null check (side in ('receivable', 'payable')),
  amount numeric(18, 0) not null check (amount > 0),
  source text not null check (source in ('legacy_receipt', 'trade_order', 'manual')),
  source_id uuid,
  due_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (contact_id, workspace_id) references public.contacts (id, workspace_id)
);

create table public.settlements (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces (id),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(18, 0) not null check (amount > 0),
  status text not null
    check (status in ('declared', 'posted', 'rejected', 'reversed')),
  declared_by uuid not null,
  value_date date not null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (id, workspace_id)
);

create table public.settlement_confirmations (
  id uuid primary key,
  settlement_id uuid not null references public.settlements (id),
  kind text not null check (kind in ('counterparty', 'institutional')),
  by_user_id uuid not null,
  at timestamptz not null default now()
);

create table public.settlement_allocations (
  id uuid primary key,
  settlement_id uuid not null,
  workspace_id uuid not null,
  entry_id uuid,
  order_id uuid,
  amount numeric(18, 0) not null check (amount > 0),
  foreign key (settlement_id, workspace_id) references public.settlements (id, workspace_id),
  check (entry_id is not null or order_id is not null)
);

create table public.reversals (
  id uuid primary key,
  target_type text not null,
  target_id uuid not null,
  workspace_id uuid not null,
  reason text not null,
  actor_id uuid not null,
  at timestamptz not null default now()
);

-- ─── Files / notifications ───────────────────────────────────────────────────
create table public.files (
  id uuid primary key,
  status text not null check (status in ('pending', 'ready', 'rejected')),
  bucket text not null,
  storage_key text not null unique,
  mime text not null,
  byte_size int not null check (byte_size > 0),
  uploader_id uuid not null,
  sha256 text,
  workspace_id uuid,
  created_at timestamptz not null default now()
);

create table public.file_links (
  id uuid primary key,
  file_id uuid not null references public.files (id),
  resource_type text not null,
  resource_id uuid not null,
  workspace_id uuid not null
);

create table public.notification_inbox (
  id uuid primary key,
  user_id uuid not null,
  type text not null,
  title text not null,
  body_safe text not null,
  read_at timestamptz,
  dedup_key text,
  created_at timestamptz not null default now(),
  unique (user_id, dedup_key)
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id),
  per_type jsonb not null default '{}'::jsonb,
  quiet_hours jsonb
);

create table public.push_registrations (
  id uuid primary key,
  user_id uuid not null,
  device_id text not null,
  platform text not null,
  provider text not null default 'fcm',
  token text not null unique,
  app_version text,
  locale text,
  permission text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ─── Moderation / infra ──────────────────────────────────────────────────────
create table public.verification_cases (
  id uuid primary key,
  subject_type text not null,
  subject_id uuid not null,
  status text not null default 'open',
  assignee_id uuid,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key,
  reporter_id uuid not null,
  subject_type text not null,
  subject_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key,
  order_id uuid not null references public.trade_orders (id),
  opened_by uuid not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  reason text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.moderation_actions (
  id uuid primary key,
  case_id uuid,
  actor_id uuid not null,
  action text not null,
  reason text not null,
  at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  resource text not null,
  resource_id uuid,
  diff jsonb not null default '{}'::jsonb,
  request_id text,
  at timestamptz not null default now()
);

create table public.outbox_events (
  id bigint generated always as identity primary key,
  topic text not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'dead')),
  attempts int not null default 0,
  available_at timestamptz not null default now()
);

create index outbox_events_poll_idx
  on public.outbox_events (available_at, id)
  where status = 'pending';

create table public.idempotency_records (
  workspace_id uuid not null,
  actor_id uuid not null,
  command_type text not null,
  key text not null,
  request_hash text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (workspace_id, actor_id, command_type, key)
);

create table public.idempotent_operations (
  operation_id uuid primary key,
  workspace_id uuid not null,
  command_type text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, operation_id)
);

create table public.sync_operations (
  id uuid primary key,
  workspace_id uuid not null,
  actor_id uuid not null,
  device_id text not null,
  operation_id uuid not null,
  type text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table public.change_feed (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  op text not null check (op in ('upsert', 'delete', 'reverse')),
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid,
  committed_at timestamptz not null default now()
);

create index change_feed_ws_id_idx on public.change_feed (workspace_id, id);

create table public.admin_areas (
  code text not null,
  version int not null,
  name text not null,
  primary key (code, version)
);

create table public.admin_area_versions (
  version int primary key,
  effective_from date not null,
  note text
);

-- ─── Billing phần mềm (tách settlements) ─────────────────────────────────────
create table public.plans (
  id uuid primary key,
  code text not null unique,
  name_vi text not null
);

create table public.entitlements (
  workspace_id uuid not null references public.workspaces (id),
  code text not null,
  active boolean not null default true,
  primary key (workspace_id, code)
);

create table public.billing_events (
  id bigint generated always as identity primary key,
  workspace_id uuid,
  user_id uuid,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists workspace_id uuid references public.workspaces (id);

-- ─── Seed catalog / RBAC ─────────────────────────────────────────────────────
insert into public.units (code, to_kg) values
  ('kg', 1),
  ('hg', 0.1)
on conflict (code) do nothing;

insert into public.commodities (id, code, name_vi, crop) values
  ('11111111-1111-4111-8111-111111111111', 'rubber_latex', 'Mủ nước', 'rubber'),
  ('11111111-1111-4111-8111-111111111112', 'cashew', 'Hạt điều', 'cashew'),
  ('11111111-1111-4111-8111-111111111113', 'coffee', 'Cà phê', 'coffee'),
  ('11111111-1111-4111-8111-111111111114', 'pepper', 'Hồ tiêu', 'pepper')
on conflict (id) do nothing;

insert into public.permissions (code, description) values
  ('workspaces.read', 'Đọc workspace'),
  ('workspaces.manage', 'Sửa workspace'),
  ('workspaces.invite', 'Mời thành viên'),
  ('workspaces.transfer_owner', 'Đổi owner'),
  ('farms.manage', 'Trang trại / lô'),
  ('listings.manage', 'Tin bán / nhu cầu'),
  ('locations.manage', 'Điểm thu mua'),
  ('locations.publish', 'Gửi duyệt điểm'),
  ('quotations.send', 'Gửi báo giá'),
  ('quotations.accept', 'Chấp nhận báo giá'),
  ('orders.confirm', 'Xác nhận đơn'),
  ('orders.cancel', 'Hủy đơn'),
  ('appointments.manage', 'Lịch hẹn'),
  ('fulfillments.weigh', 'Cân hàng'),
  ('fulfillments.accept', 'Chấp nhận nhận hàng'),
  ('inventory.manage', 'Kho'),
  ('settlements.declare', 'Khai báo tiền'),
  ('settlements.confirm', 'Xác nhận tiền'),
  ('settlements.allocate', 'Phân bổ tiền'),
  ('settlements.reverse', 'Đảo khoản'),
  ('export.financial', 'Xuất dữ liệu tài chính'),
  ('billing.manage', 'Gói phần mềm'),
  ('approvals.act', 'Duyệt hạn mức'),
  ('moderation.review', 'Duyệt điểm/UGC')
on conflict (code) do nothing;

insert into public.roles (id, workspace_id, code, name_vi, is_system) values
  ('22222222-2222-4222-8222-000000000001', null, 'owner', 'Chủ', true),
  ('22222222-2222-4222-8222-000000000002', null, 'manager', 'Quản lý', true),
  ('22222222-2222-4222-8222-000000000003', null, 'procurement', 'Mua hàng', true),
  ('22222222-2222-4222-8222-000000000004', null, 'sales', 'Bán hàng', true),
  ('22222222-2222-4222-8222-000000000005', null, 'warehouse', 'Kho', true),
  ('22222222-2222-4222-8222-000000000006', null, 'accountant', 'Kế toán', true),
  ('22222222-2222-4222-8222-000000000007', null, 'viewer', 'Chỉ xem', true)
on conflict (id) do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'owner' and r.workspace_id is null
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'workspaces.read', 'workspaces.invite', 'farms.manage', 'listings.manage',
  'locations.manage', 'locations.publish', 'quotations.send', 'quotations.accept',
  'orders.confirm', 'orders.cancel', 'appointments.manage', 'fulfillments.weigh',
  'fulfillments.accept', 'inventory.manage', 'approvals.act', 'export.financial'
)
where r.code = 'manager' and r.workspace_id is null
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'workspaces.read', 'listings.manage', 'quotations.send', 'quotations.accept',
  'orders.confirm', 'appointments.manage'
)
where r.code = 'procurement' and r.workspace_id is null
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'workspaces.read', 'listings.manage', 'locations.manage', 'quotations.send',
  'quotations.accept', 'orders.confirm', 'appointments.manage'
)
where r.code = 'sales' and r.workspace_id is null
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'workspaces.read', 'fulfillments.weigh', 'fulfillments.accept',
  'inventory.manage', 'appointments.manage'
)
where r.code = 'warehouse' and r.workspace_id is null
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'workspaces.read', 'settlements.declare', 'settlements.confirm',
  'settlements.allocate', 'settlements.reverse', 'export.financial'
)
where r.code = 'accountant' and r.workspace_id is null
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in ('workspaces.read')
where r.code = 'viewer' and r.workspace_id is null
on conflict do nothing;

-- ─── Nearby parameterized (lng, lat — thứ tự longitude, latitude) ────────────
create or replace function public.locations_nearby(
  p_lng double precision,
  p_lat double precision,
  p_radius_m double precision,
  p_commodity_id uuid,
  p_limit int,
  p_after_distance double precision,
  p_after_id uuid
)
returns table (
  id uuid,
  name text,
  distance_m double precision,
  public_contact_name text,
  public_phone text,
  pickup_available boolean
)
language sql
stable
as $$
  select
    l.id,
    l.name,
    st_distance(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m,
    l.public_contact_name,
    l.public_phone,
    coalesce(bool_or(c.pickup_available), false) as pickup_available
  from public.locations l
  left join public.procurement_capabilities c on c.location_id = l.id
  where l.deleted_at is null
    and l.publish_status = 'published'
    and l.type = 'procurement_point'
    and (p_commodity_id is null or c.commodity_id = p_commodity_id)
    and l.geog is not null
    and st_dwithin(
      l.geog,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    and (
      p_after_distance is null
      or st_distance(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) > p_after_distance
      or (
        st_distance(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) = p_after_distance
        and l.id > p_after_id
      )
    )
  group by l.id
  order by distance_m asc, l.id asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- ─── updated_at ──────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'identity_verifications', 'user_preferences', 'workspaces', 'memberships',
    'business_parties', 'contacts', 'workspace_products', 'farms', 'harvest_lots',
    'branches', 'locations', 'sell_listings', 'buy_requests', 'quotations',
    'trade_orders', 'appointments', 'fulfillments', 'inventory_lots', 'settlements'
  ]
  loop
    execute format(
      'drop trigger if exists %I_touch on public.%I;
       create trigger %I_touch before update on public.%I
       for each row execute function public.touch_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;
