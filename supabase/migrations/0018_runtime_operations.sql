-- Shared across API replicas; callers can only consume their own fixed-window budget.
create table public.api_rate_limits (
 actor_id uuid primary key references auth.users(id),
 window_start timestamptz not null,
 hits integer not null check(hits>0)
);
revoke all on public.api_rate_limits from public,anon,authenticated,mambo_app,mambo_worker;
create function public.consume_api_budget() returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare n integer; a uuid:=public.app_actor_id(); t timestamptz:=date_trunc('minute',clock_timestamp());
begin
 if a is null then return false; end if;
 insert into public.api_rate_limits(actor_id,window_start,hits) values(a,t,1)
 on conflict(actor_id) do update set window_start=t,
 hits=case when api_rate_limits.window_start=t then api_rate_limits.hits+1 else 1 end
 returning hits into n;
 return n<=300;
end $$;
revoke all on function public.consume_api_budget() from public,anon,authenticated;
grant execute on function public.consume_api_budget() to mambo_app;

-- Closing the unfulfilled balance retains posted stock/debt and releases only unused stock.
create function public.close_trade_remainder(oid uuid,expected integer,reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare o public.trade_orders; r public.stock_reservations;
begin
 if not public.actor_can(public.app_workspace_id(),'orders.cancel') or not exists(
  select 1 from public.order_participants where order_id=oid and workspace_id=public.app_workspace_id()
 ) then raise exception 'PERMISSION_DENIED: Không đủ quyền.'; end if;
 if reason is null or length(trim(reason))=0 or length(reason)>1000 then raise exception 'VALIDATION_FAILED: Cần lý do chốt phần còn lại.'; end if;
 select * into o from public.trade_orders where id=oid for update;
 if o.version<>expected then raise exception 'VERSION_CONFLICT: Đơn đã đổi.'; end if;
 if o.status<>'in_fulfillment' or not exists(select 1 from public.acceptance_records a join public.fulfillments f on f.id=a.fulfillment_id where f.order_id=oid and a.posted)
 then raise exception 'INVALID_STATE_TRANSITION: Chỉ chốt đơn đã nhận một phần.'; end if;
 if exists(select 1 from public.fulfillments where order_id=oid and status in('expected','weighed','qc'))
 then raise exception 'INVALID_STATE_TRANSITION: Còn đợt giao chưa xử lý.'; end if;
 for r in select * from public.stock_reservations where order_id=oid and status='active' order by id for update loop
  if r.harvest_lot_id is not null then update public.harvest_lots set reserved_qty=reserved_qty-(r.qty-r.consumed_qty),version=version+1 where id=r.harvest_lot_id; end if;
  if r.lot_id is not null then update public.inventory_lots set qty_reserved=qty_reserved-(r.qty-r.consumed_qty),version=version+1 where id=r.lot_id; end if;
  update public.stock_reservations set status='released' where id=r.id;
 end loop;
 update public.trade_orders set status='completed',completed_at=now(),version=version+1,
 terms_snapshot=terms_snapshot||jsonb_build_object('remainderClosure',jsonb_build_object('reason',trim(reason),'actorId',public.app_actor_id(),'at',now())) where id=oid;
 return (select to_jsonb(t) from public.trade_orders t where id=oid);
end $$;
revoke all on function public.close_trade_remainder(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.close_trade_remainder(uuid,integer,text) to mambo_app;
