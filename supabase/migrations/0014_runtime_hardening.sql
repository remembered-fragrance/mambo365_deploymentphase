-- Runtime persistence/security. Apply with a migration account, never the API login.
create table public.platform_admins(user_id uuid primary key references auth.users(id));
grant usage on schema auth to mambo_app;
grant execute on function auth.uid() to mambo_app;
revoke all on public.platform_admins from public, anon, authenticated, mambo_app, mambo_worker;

-- These helpers deliberately bypass table RLS, preventing recursive membership policies.
create or replace function public.actor_is_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.memberships m join public.workspaces w on w.id=m.workspace_id
 where m.workspace_id=p_workspace_id and m.user_id=public.app_actor_id()
 and m.status='active' and m.revoked_at is null and w.status='active');
$$;
create or replace function public.app_is_platform() returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.platform_admins where user_id=public.app_actor_id());
$$;
create function public.actor_owns_workspace(w uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.workspaces where id=w and owner_user_id=public.app_actor_id());
$$;
create or replace function public.actor_is_order_participant(p_order_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.trade_orders o join public.business_parties b on b.id in(o.buyer_party_id,o.seller_party_id)
 where o.id=p_order_id and public.actor_is_workspace_member(b.workspace_id));
$$;
create function public.actor_is_quote_party(q uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.quotations t join public.business_parties b on b.id in(t.from_party_id,t.to_party_id)
 where t.id=q and public.actor_is_workspace_member(b.workspace_id));
$$;
create function public.actor_can(w uuid, p text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select public.actor_is_workspace_member(w) and exists(select 1 from public.memberships m join public.role_permissions rp on rp.role_id=m.role_id
 where m.workspace_id=w and m.user_id=public.app_actor_id() and m.status='active' and m.revoked_at is null and rp.permission_code=p);
$$;

-- Replace the incomplete P0 policies without changing legacy PostgREST read policies.
do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public'
 and tablename in('identity_verifications','user_preferences','devices','deletion_requests','permissions','roles','role_permissions','workspaces','memberships','membership_scopes','invitations','business_parties','farmer_profiles','trader_profiles','enterprise_profiles','contacts','contact_links','commodities','grades','units','workspace_products','farms','harvest_lots','branches','locations','location_hours','location_hour_overrides','procurement_capabilities','price_quotes','sell_listings','buy_requests','listing_media','follows','quotations','quotation_revisions','quotation_lines','document_sequences','trade_orders','order_lines','order_participants','order_events','workspace_order_views','internal_notes','approval_requests','approval_actions','appointments','fulfillments','weighing_records','quality_checks','acceptance_records','warehouses','inventory_lots','stock_movements','stock_reservations','receivable_payable_entries','settlements','settlement_confirmations','settlement_allocations','reversals','files','file_links','notification_inbox','notification_preferences','push_registrations','verification_cases','reports','disputes','moderation_actions','audit_events','outbox_events','idempotency_records','idempotent_operations','sync_operations','change_feed','admin_areas','admin_area_versions','plans','entitlements','billing_events') loop
 execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
end $$;

grant select,insert,update on public.profiles to mambo_app;
create policy api_profile_self on public.profiles to mambo_app using(id=public.app_actor_id()) with check(id=public.app_actor_id());
create policy api_workspaces on public.workspaces to mambo_app using(public.actor_is_workspace_member(id) or owner_user_id=public.app_actor_id())
 with check(public.actor_owns_workspace(id) or owner_user_id=public.app_actor_id());
create policy api_memberships_read on public.memberships for select to mambo_app using(user_id=public.app_actor_id() or public.actor_is_workspace_member(workspace_id));
create policy api_memberships_insert on public.memberships for insert to mambo_app with check(public.actor_owns_workspace(workspace_id));
create policy api_memberships_update on public.memberships for update to mambo_app using(public.actor_can(workspace_id,'workspaces.invite')) with check(public.actor_can(workspace_id,'workspaces.invite'));
create policy api_parties_read on public.business_parties for select to mambo_app using(public.app_actor_id() is not null);
create policy api_parties_write on public.business_parties for insert to mambo_app with check(public.actor_is_workspace_member(workspace_id));

do $$ declare t text; begin
 foreach t in array array['commodities','grades','units','permissions','roles','role_permissions','admin_areas','plans'] loop
 execute format('create policy api_catalog on public.%I for select to mambo_app using(true)',t);
 end loop;
 foreach t in array array['user_preferences','identity_verifications','devices','deletion_requests','follows','notification_inbox','notification_preferences','push_registrations'] loop
 execute format('create policy api_self on public.%I to mambo_app using(user_id=public.app_actor_id()) with check(user_id=public.app_actor_id())',t);
 end loop;
 foreach t in array array['contacts','contact_links','workspace_products','farms','harvest_lots','branches','warehouses','inventory_lots','stock_movements','stock_reservations','receivable_payable_entries','settlements','settlement_allocations','reversals','internal_notes','workspace_order_views','document_sequences','entitlements','membership_scopes','listing_media','approval_requests'] loop
 execute format('create policy api_workspace on public.%I to mambo_app using(public.actor_is_workspace_member(workspace_id)) with check(public.actor_is_workspace_member(workspace_id))',t);
 end loop;
 foreach t in array array['farmer_profiles','trader_profiles','enterprise_profiles'] loop
 execute format('create policy api_party on public.%I to mambo_app using(exists(select 1 from public.business_parties b where b.id=party_id and public.actor_is_workspace_member(b.workspace_id))) with check(exists(select 1 from public.business_parties b where b.id=party_id and public.actor_is_workspace_member(b.workspace_id)))',t);
 end loop;
 foreach t in array array['sell_listings','buy_requests'] loop
 execute format('create policy api_market_read on public.%I for select to mambo_app using((status=''published'' and deleted_at is null) or public.actor_is_workspace_member(workspace_id))',t);
 execute format('create policy api_market_insert on public.%I for insert to mambo_app with check(public.actor_is_workspace_member(workspace_id))',t);
 execute format('create policy api_market_update on public.%I for update to mambo_app using(public.actor_is_workspace_member(workspace_id)) with check(public.actor_is_workspace_member(workspace_id))',t);
 end loop;
 foreach t in array array['locations','location_hours','location_hour_overrides','procurement_capabilities','price_quotes'] loop
 if t='locations' then
 execute 'create policy api_geo_read on public.locations for select to mambo_app using((publish_status=''published'' and deleted_at is null) or public.actor_is_workspace_member(workspace_id) or public.app_is_platform())';
 else
 execute format('create policy api_geo_read on public.%I for select to mambo_app using(public.actor_is_workspace_member(workspace_id) or exists(select 1 from public.locations l where l.id=location_id and l.publish_status=''published'' and l.deleted_at is null))',t);
 end if;
 execute format('create policy api_geo_insert on public.%I for insert to mambo_app with check(public.actor_is_workspace_member(workspace_id))',t);
 execute format('create policy api_geo_update on public.%I for update to mambo_app using(public.actor_is_workspace_member(workspace_id) or public.app_is_platform()) with check(public.actor_is_workspace_member(workspace_id) or public.app_is_platform())',t);
 end loop;
end $$;
grant delete on public.follows to mambo_app;
create policy api_invitations on public.invitations to mambo_app using(public.actor_can(workspace_id,'workspaces.invite')) with check(public.actor_can(workspace_id,'workspaces.invite'));
create policy api_quotes_read on public.quotations for select to mambo_app using(public.actor_is_quote_party(id));
create policy api_quotes_insert on public.quotations for insert to mambo_app with check(exists(select 1 from business_parties b where b.id=from_party_id and public.actor_is_workspace_member(b.workspace_id)));
create policy api_quotes_update on public.quotations for update to mambo_app using(public.actor_is_quote_party(id)) with check(public.actor_is_quote_party(id));
create policy api_revisions on public.quotation_revisions to mambo_app using(public.actor_is_quote_party(quotation_id)) with check(public.actor_is_quote_party(quotation_id));
create policy api_quote_lines on public.quotation_lines to mambo_app using(exists(select 1 from quotation_revisions r where r.id=revision_id and public.actor_is_quote_party(r.quotation_id))) with check(exists(select 1 from quotation_revisions r where r.id=revision_id and public.actor_is_quote_party(r.quotation_id)));
create policy api_orders on public.trade_orders to mambo_app using(public.actor_is_order_participant(id)) with check(public.actor_is_order_participant(id));
do $$ declare t text; begin
 foreach t in array array['order_lines','order_participants','order_events','appointments','fulfillments'] loop
 execute format('create policy api_order on public.%I to mambo_app using(public.actor_is_order_participant(order_id)) with check(public.actor_is_order_participant(order_id))',t);
 end loop;
 foreach t in array array['weighing_records','quality_checks','acceptance_records'] loop
 execute format('create policy api_receiving on public.%I to mambo_app using(exists(select 1 from public.fulfillments f where f.id=fulfillment_id and public.actor_is_order_participant(f.order_id))) with check(exists(select 1 from public.fulfillments f where f.id=fulfillment_id and public.actor_is_order_participant(f.order_id)))',t);
 end loop;
end $$;
create policy api_confirmations on public.settlement_confirmations to mambo_app using(exists(select 1 from settlements s where s.id=settlement_id and public.actor_is_workspace_member(s.workspace_id))) with check(exists(select 1 from settlements s where s.id=settlement_id and public.actor_is_workspace_member(s.workspace_id)));
create policy api_files on public.files to mambo_app using(public.actor_is_workspace_member(workspace_id)) with check(public.actor_is_workspace_member(workspace_id) and uploader_id=public.app_actor_id());
create policy api_audit_write on public.audit_events for insert to mambo_app with check(actor_id=public.app_actor_id());
create policy api_audit_read on public.audit_events for select to mambo_app using(public.app_is_platform());
create policy api_outbox_insert on public.outbox_events for insert to mambo_app with check(public.app_actor_id() is not null);
create policy worker_outbox on public.outbox_events to mambo_worker using(true) with check(true);
create policy worker_inbox on public.notification_inbox to mambo_worker using(true) with check(true);

create table public.api_commands(
 actor_id uuid not null, workspace_key text not null, operation_key text not null,
 command_type text not null, request_hash text not null, response jsonb not null,
 created_at timestamptz not null default now(), primary key(actor_id,workspace_key,operation_key)
);
alter table public.api_commands enable row level security;
revoke all on public.api_commands from public,anon,authenticated;
grant select,insert on public.api_commands to mambo_app;
create policy api_commands_self on public.api_commands to mambo_app using(actor_id=public.app_actor_id() and workspace_key=coalesce(public.app_workspace_id()::text,'')) with check(actor_id=public.app_actor_id() and workspace_key=coalesce(public.app_workspace_id()::text,''));
-- Operation records are permanent business deduplication, not a response-cache TTL.

alter table public.quotation_revisions add column offered_by_workspace_id uuid references public.workspaces(id);
alter table public.fulfillments add column order_line_id uuid references public.order_lines(id);
create unique index one_order_per_revision on public.trade_orders(source_quotation_revision_id) where source_quotation_revision_id is not null;
create unique index one_posting_per_fulfillment on public.acceptance_records(fulfillment_id) where posted;
alter table public.inventory_lots add column source_fulfillment_id uuid references public.fulfillments(id);
create unique index inventory_receipt_unique on public.inventory_lots(workspace_id,source_fulfillment_id) where source_fulfillment_id is not null;
alter table public.settlement_allocations add constraint allocation_entry_workspace_fk foreign key(entry_id,workspace_id) references public.receivable_payable_entries(id,workspace_id);
create unique index one_reversal_per_target on public.reversals(workspace_id,target_type,target_id);
alter table public.outbox_events add column locked_until timestamptz, add column locked_by uuid, add column last_error text, add column completed_at timestamptz;
create index outbox_claimable on public.outbox_events(status,available_at,id) where status in('pending','processing');
create index memberships_actor on public.memberships(user_id,workspace_id) where status='active' and revoked_at is null;
create index quote_parties on public.quotations(from_party_id,to_party_id);
create index orders_buyer on public.trade_orders(buyer_party_id);
create index orders_seller on public.trade_orders(seller_party_id);
create index rp_workspace on public.receivable_payable_entries(workspace_id,status);
create index allocations_entry on public.settlement_allocations(entry_id);

-- A per-workspace counter is locked until COMMIT. A global sequence alone can skip
-- late-committing transactions when clients advance their cursor.
create table public.workspace_cursors(workspace_id uuid primary key references public.workspaces(id), last_value bigint not null default 0);
alter table public.workspace_cursors enable row level security;
revoke all on public.workspace_cursors from public,anon,authenticated;
grant select on public.workspace_cursors to mambo_app;
create policy cursor_member on public.workspace_cursors for select to mambo_app using(public.actor_is_workspace_member(workspace_id));
alter table public.change_feed add column workspace_seq bigint;
create unique index feed_workspace_sequence on public.change_feed(workspace_id,workspace_seq);
create policy feed_member on public.change_feed for select to mambo_app using(public.actor_is_workspace_member(workspace_id));
create function public.record_workspace_change(w uuid,t text,i uuid,p jsonb) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare n bigint; begin
 insert into public.workspace_cursors(workspace_id,last_value) values(w,1) on conflict(workspace_id) do update set last_value=workspace_cursors.last_value+1 returning last_value into n;
 insert into public.change_feed(workspace_id,workspace_seq,aggregate_type,aggregate_id,op,payload,actor_id) values(w,n,t,i,'upsert',p,public.app_actor_id());
end $$;
create function public.capture_workspace_change() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin perform public.record_workspace_change(new.workspace_id,tg_table_name,new.id,to_jsonb(new)); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['farms','harvest_lots','locations','sell_listings','buy_requests','inventory_lots','settlements','receivable_payable_entries','contacts','workspace_products'] loop
 execute format('create trigger capture_change after insert or update on public.%I for each row execute function public.capture_workspace_change()',t);
 end loop;
end $$;
create function public.capture_order_change() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare w uuid; begin
 for w in select workspace_id from public.business_parties where id in(new.buyer_party_id,new.seller_party_id) order by workspace_id loop
 perform public.record_workspace_change(w,'trade_orders',new.id,to_jsonb(new)); end loop; return new;
end $$;
create trigger capture_order_change after insert or update on public.trade_orders for each row execute function public.capture_order_change();

create function public.accept_workspace_invitation(p_token_hash text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare inv public.invitations; ident public.profiles; mid uuid; begin
 select * into inv from public.invitations where token_hash=p_token_hash for update;
 if inv.id is null or inv.expires_at<=now() or inv.accepted_at is not null then raise exception 'VALIDATION_FAILED: Lời mời không hợp lệ.'; end if;
 select * into ident from public.profiles where id=public.app_actor_id();
 if not exists(select 1 from auth.users u where u.id=public.app_actor_id() and ((lower(u.email)=lower(inv.email_or_phone) and u.email_confirmed_at is not null) or (u.phone=inv.email_or_phone and u.phone_confirmed_at is not null))) then raise exception 'PERMISSION_DENIED: Lời mời dành cho danh tính đã xác minh khác.'; end if;
 insert into public.memberships(id,workspace_id,user_id,role_id,status) values(gen_random_uuid(),inv.workspace_id,public.app_actor_id(),inv.role_id,'active')
 on conflict(workspace_id,user_id) do update set role_id=excluded.role_id,status='active',revoked_at=null returning id into mid;
 update public.invitations set accepted_at=now() where id=inv.id;
 return jsonb_build_object('workspaceId',inv.workspace_id,'membershipId',mid);
end $$;

-- Reject direct client writes to P0 functions. Explicit grants only.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('actor_is_workspace_member','app_is_platform','actor_owns_workspace','actor_is_order_participant','actor_is_quote_party','actor_can','record_workspace_change','capture_workspace_change','capture_order_change','accept_workspace_invitation') loop
 execute format('revoke all on function %s from public,anon,authenticated,mambo_app,mambo_worker',f.signature);
 end loop;
end $$;
grant execute on function public.actor_is_workspace_member(uuid),public.app_is_platform(),public.actor_owns_workspace(uuid),public.actor_is_order_participant(uuid),public.actor_is_quote_party(uuid),public.actor_can(uuid,text),public.accept_workspace_invitation(text) to mambo_app;
