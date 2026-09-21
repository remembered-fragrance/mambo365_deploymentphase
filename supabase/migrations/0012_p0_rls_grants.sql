-- 0012 — RLS defense-in-depth + role mambo_app / mambo_worker (ADR-003)
--
-- Policy đọc app.actor_id / app.workspace_id do NestJS SET LOCAL trong TX.
-- Client PostgREST (auth.uid()) KHÔNG ghi bảng mới: revoke authenticated.
-- Bảng legacy (transactions, …) giữ RLS user_id như 0005.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mambo_app') then
    create role mambo_app nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'mambo_worker') then
    create role mambo_worker nologin noinherit;
  end if;
end $$;

alter role mambo_app with nobypassrls;
alter role mambo_worker with nobypassrls;

create or replace function public.actor_is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = p_workspace_id
      and m.user_id = public.app_actor_id()
      and m.status = 'active'
      and m.revoked_at is null
  );
$$;

create or replace function public.actor_is_order_participant(p_order_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.order_participants op
    join public.memberships m
      on m.workspace_id = op.workspace_id
     and m.user_id = public.app_actor_id()
     and m.status = 'active'
     and m.revoked_at is null
    where op.order_id = p_order_id
  );
$$;

-- Bật RLS mọi bảng P0
do $$
declare
  t text;
begin
  foreach t in array array[
    'identity_verifications', 'user_preferences', 'devices', 'deletion_requests',
    'permissions', 'roles', 'role_permissions', 'workspaces', 'memberships',
    'membership_scopes', 'invitations', 'business_parties', 'farmer_profiles',
    'trader_profiles', 'enterprise_profiles', 'contacts', 'contact_links',
    'commodities', 'grades', 'units', 'workspace_products', 'farms', 'harvest_lots',
    'branches', 'locations', 'location_hours', 'location_hour_overrides',
    'procurement_capabilities', 'price_quotes', 'sell_listings', 'buy_requests',
    'listing_media', 'follows', 'quotations', 'quotation_revisions', 'quotation_lines',
    'document_sequences', 'trade_orders', 'order_lines', 'order_participants',
    'order_events', 'workspace_order_views', 'internal_notes', 'approval_requests',
    'approval_actions', 'appointments', 'fulfillments', 'weighing_records',
    'quality_checks', 'acceptance_records', 'warehouses', 'inventory_lots',
    'stock_movements', 'stock_reservations', 'receivable_payable_entries',
    'settlements', 'settlement_confirmations', 'settlement_allocations', 'reversals',
    'files', 'file_links', 'notification_inbox', 'notification_preferences',
    'push_registrations', 'verification_cases', 'reports', 'disputes',
    'moderation_actions', 'audit_events', 'outbox_events', 'idempotency_records',
    'idempotent_operations', 'sync_operations', 'change_feed', 'admin_areas',
    'admin_area_versions', 'plans', 'entitlements', 'billing_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
  end loop;
end $$;

revoke execute on function public.locations_nearby(
  double precision, double precision, double precision, uuid, int, double precision, uuid
) from public, anon, authenticated;

grant usage on schema public to mambo_app, mambo_worker;

grant select on public.permissions, public.roles, public.role_permissions,
  public.commodities, public.grades, public.units, public.admin_areas, public.plans
  to mambo_app, mambo_worker;

grant select, insert, update on
  public.identity_verifications, public.user_preferences, public.devices,
  public.deletion_requests, public.workspaces, public.memberships,
  public.membership_scopes, public.invitations, public.business_parties,
  public.farmer_profiles, public.trader_profiles, public.enterprise_profiles,
  public.contacts, public.contact_links, public.workspace_products, public.farms,
  public.harvest_lots, public.branches, public.locations, public.location_hours,
  public.location_hour_overrides, public.procurement_capabilities, public.price_quotes,
  public.sell_listings, public.buy_requests, public.listing_media, public.follows,
  public.quotations, public.quotation_revisions, public.quotation_lines,
  public.document_sequences, public.trade_orders, public.order_lines,
  public.order_participants, public.workspace_order_views, public.internal_notes,
  public.approval_requests, public.approval_actions, public.appointments,
  public.fulfillments, public.quality_checks, public.acceptance_records,
  public.warehouses, public.inventory_lots, public.stock_reservations,
  public.receivable_payable_entries, public.settlements, public.settlement_confirmations,
  public.settlement_allocations, public.files, public.file_links,
  public.notification_inbox, public.notification_preferences, public.push_registrations,
  public.verification_cases, public.reports, public.disputes, public.idempotency_records,
  public.idempotent_operations, public.sync_operations, public.entitlements
to mambo_app;

grant insert on
  public.order_events, public.weighing_records, public.stock_movements,
  public.reversals, public.audit_events, public.outbox_events, public.change_feed,
  public.billing_events, public.moderation_actions
to mambo_app;

grant select on
  public.order_events, public.weighing_records, public.stock_movements,
  public.reversals, public.audit_events, public.outbox_events, public.change_feed,
  public.billing_events, public.moderation_actions
to mambo_app;

grant usage, select on all sequences in schema public to mambo_app, mambo_worker;

grant select, update on public.outbox_events to mambo_worker;
grant insert, select on public.notification_inbox, public.audit_events to mambo_worker;

grant execute on function public.locations_nearby(
  double precision, double precision, double precision, uuid, int, double precision, uuid
) to mambo_app;

grant execute on function public.app_actor_id() to mambo_app, mambo_worker;
grant execute on function public.app_workspace_id() to mambo_app, mambo_worker;
grant execute on function public.app_is_platform() to mambo_app, mambo_worker;
grant execute on function public.actor_is_workspace_member(uuid) to mambo_app, mambo_worker;
grant execute on function public.actor_is_order_participant(uuid) to mambo_app, mambo_worker;

-- Catalog đọc được mọi actor đã xác thực phía Nest (SET LOCAL actor)
create policy commodities_read on public.commodities for select using (public.app_actor_id() is not null);
create policy grades_read on public.grades for select using (public.app_actor_id() is not null);
create policy units_read on public.units for select using (true);
create policy permissions_read on public.permissions for select using (public.app_actor_id() is not null);
create policy roles_read on public.roles for select using (public.app_actor_id() is not null);
create policy role_permissions_read on public.role_permissions for select using (public.app_actor_id() is not null);

create policy workspaces_member on public.workspaces
  for all using (
    public.app_is_platform()
    or owner_user_id = public.app_actor_id()
    or public.actor_is_workspace_member(id)
  )
  with check (
    public.app_is_platform() or owner_user_id = public.app_actor_id()
    or public.actor_is_workspace_member(id)
  );

create policy memberships_self_or_ws on public.memberships
  for all using (
    user_id = public.app_actor_id() or public.actor_is_workspace_member(workspace_id)
  )
  with check (public.actor_is_workspace_member(workspace_id) or user_id = public.app_actor_id());

create policy ws_isolation on public.farms
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy harvest_lots_ws on public.harvest_lots
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy locations_public_or_ws on public.locations
  for select using (
    (publish_status = 'published' and deleted_at is null)
    or public.actor_is_workspace_member(workspace_id)
    or public.app_is_platform()
  );

create policy locations_write_ws on public.locations
  for insert with check (public.actor_is_workspace_member(workspace_id));

create policy locations_update_ws on public.locations
  for update using (public.actor_is_workspace_member(workspace_id) or public.app_is_platform());

create policy contacts_ws on public.contacts
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy listings_ws on public.sell_listings
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy buy_requests_ws on public.buy_requests
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy inventory_ws on public.inventory_lots
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy warehouses_ws on public.warehouses
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy settlements_ws on public.settlements
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy rp_ws on public.receivable_payable_entries
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy notes_ws on public.internal_notes
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy views_ws on public.workspace_order_views
  for all using (public.actor_is_workspace_member(workspace_id))
  with check (public.actor_is_workspace_member(workspace_id));

create policy orders_participant on public.trade_orders
  for select using (public.actor_is_order_participant(id) or public.app_is_platform());

create policy orders_write on public.trade_orders
  for insert with check (public.actor_is_workspace_member(issuer_workspace_id));

create policy orders_update on public.trade_orders
  for update using (public.actor_is_order_participant(id));

create policy quotations_party on public.quotations
  for all using (
    exists (
      select 1 from public.business_parties bp
      join public.memberships m on m.workspace_id = bp.workspace_id
        and m.user_id = public.app_actor_id() and m.status = 'active' and m.revoked_at is null
      where bp.id in (from_party_id, to_party_id)
    )
  );

create policy change_feed_ws on public.change_feed
  for select using (public.actor_is_workspace_member(workspace_id));

create policy change_feed_insert on public.change_feed
  for insert with check (public.actor_is_workspace_member(workspace_id) or public.app_actor_id() is not null);

create policy audit_insert on public.audit_events
  for insert with check (public.app_actor_id() is not null or public.app_is_platform());

create policy audit_no_update on public.audit_events
  for update using (false);

create policy outbox_worker on public.outbox_events
  for all using (public.app_is_platform() or public.app_actor_id() is not null);

create policy devices_self on public.devices
  for all using (user_id = public.app_actor_id())
  with check (user_id = public.app_actor_id());

create policy inbox_self on public.notification_inbox
  for all using (user_id = public.app_actor_id())
  with check (user_id = public.app_actor_id());

create policy follows_self on public.follows
  for all using (user_id = public.app_actor_id())
  with check (user_id = public.app_actor_id());

create policy files_uploader on public.files
  for select using (uploader_id = public.app_actor_id() or public.actor_is_workspace_member(workspace_id));

-- authenticated / anon: không GRANT bảng mới (đã revoke). Policy ở trên cho mambo_*.
