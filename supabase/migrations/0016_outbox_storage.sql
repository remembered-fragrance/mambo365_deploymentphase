create function public.outbox_recipients(eid bigint) returns table(user_id uuid)
language sql stable security definer set search_path=pg_catalog,public as $$
 select distinct m.user_id from public.outbox_events e
 join public.memberships m on (
  m.workspace_id=nullif(e.payload->>'workspaceId','')::uuid
  or m.workspace_id in(select p.workspace_id from public.order_participants p where p.order_id=nullif(e.payload->>'orderId','')::uuid)
  or m.workspace_id in(select b.workspace_id from public.quotations q join public.business_parties b on b.id in(q.from_party_id,q.to_party_id) where q.id=nullif(e.payload->>'quotationId','')::uuid)
 ) where e.id=eid and m.status='active' and m.revoked_at is null
 union select nullif(payload->>'userId','')::uuid from public.outbox_events where id=eid and payload->>'userId' is not null;
$$;
revoke all on function public.outbox_recipients(bigint) from public,anon,authenticated,mambo_app;
grant execute on function public.outbox_recipients(bigint) to mambo_worker;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trade-private','trade-private',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
revoke update,delete on public.settlement_allocations,public.settlement_confirmations,public.weighing_records,public.stock_movements,public.reversals,public.audit_events,public.api_commands from mambo_app;
