alter table public.profiles add column api_migrated_at timestamptz;
create table public.legacy_cursors(user_id uuid primary key references public.profiles(id),last_value bigint not null default 0);
create table public.legacy_change_feed(user_id uuid not null,seq bigint not null,table_name text not null,record_id uuid not null,payload jsonb not null,primary key(user_id,seq));
alter table public.legacy_cursors enable row level security;
alter table public.legacy_change_feed enable row level security;
revoke all on public.legacy_cursors,public.legacy_change_feed from public,anon,authenticated;
grant select on public.legacy_cursors,public.legacy_change_feed to mambo_app;
create policy api_legacy_cursor on public.legacy_cursors for select to mambo_app using(user_id=public.app_actor_id());
create policy api_legacy_feed on public.legacy_change_feed for select to mambo_app using(user_id=public.app_actor_id());
create function public.capture_legacy_change() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare n bigint; begin
 insert into public.legacy_cursors(user_id,last_value) values(new.user_id,1) on conflict(user_id) do update set last_value=legacy_cursors.last_value+1 returning last_value into n;
 insert into public.legacy_change_feed(user_id,seq,table_name,record_id,payload) values(new.user_id,n,tg_table_name,new.id,to_jsonb(new));
 return new;
end $$;
create function public.legacy_direct_write_allowed() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select not exists(select 1 from public.profiles where id=auth.uid() and api_migrated_at is not null);
$$;
do $$ declare t text; r record; n bigint; begin
 foreach t in array array['suppliers','buyers','products','transactions','payments','drafts','pricing_rules','notes'] loop
 execute format('grant select,insert,update on public.%I to mambo_app',t);
 execute format('create policy api_legacy on public.%I to mambo_app using(user_id=public.app_actor_id()) with check(user_id=public.app_actor_id())',t);
 execute format('create policy migrated_insert on public.%I as restrictive for insert to authenticated with check(public.legacy_direct_write_allowed())',t);
 execute format('create policy migrated_update on public.%I as restrictive for update to authenticated using(public.legacy_direct_write_allowed()) with check(public.legacy_direct_write_allowed())',t);
 execute format('create policy migrated_delete on public.%I as restrictive for delete to authenticated using(public.legacy_direct_write_allowed())',t);
 execute format('create trigger legacy_feed after insert or update on public.%I for each row execute function public.capture_legacy_change()',t);
 -- Backfill existing records, including tombstones, before any API cursor can be issued.
 for r in execute format('select user_id,id,to_jsonb(t) as payload from public.%I t order by user_id,id',t) loop
  insert into public.legacy_cursors(user_id,last_value) values(r.user_id,1) on conflict(user_id) do update set last_value=legacy_cursors.last_value+1 returning last_value into n;
  insert into public.legacy_change_feed(user_id,seq,table_name,record_id,payload) values(r.user_id,n,t,r.id,r.payload);
 end loop;
 end loop;
end $$;
revoke all on function public.capture_legacy_change(),public.legacy_direct_write_allowed() from public,anon;
grant execute on function public.legacy_direct_write_allowed() to authenticated;

-- Prevent bypassing API account status/session rules through direct profile updates.
revoke update on public.profiles from authenticated;
grant update(name,business_name,recovery_email) on public.profiles to authenticated;
-- Preserve independent subscription checkout policies from the previous migrations.
