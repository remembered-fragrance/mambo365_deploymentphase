alter table public.profiles add column sessions_valid_after timestamptz;
alter table public.sell_listings add column inventory_lot_id uuid references public.inventory_lots(id);
alter table public.stock_reservations add column consumed_qty numeric(18,3) not null default 0 check(consumed_qty>=0 and consumed_qty<=qty);
alter table public.receivable_payable_entries add column fulfillment_id uuid references public.fulfillments(id);
create unique index rp_fulfillment_unique on public.receivable_payable_entries(workspace_id,fulfillment_id,side) where fulfillment_id is not null;

create function public.transfer_workspace_owner(w uuid, target uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare old_user uuid; target_user uuid; begin
 select owner_user_id into old_user from public.workspaces where id=w for update;
 if old_user is distinct from public.app_actor_id() then raise exception 'PERMISSION_DENIED: Chỉ owner được chuyển quyền.'; end if;
 select user_id into target_user from public.memberships where id=target and workspace_id=w and status='active' and revoked_at is null for update;
 if target_user is null or target_user=old_user then raise exception 'VALIDATION_FAILED: Thành viên nhận không hợp lệ.'; end if;
 update public.memberships set role_id='22222222-2222-4222-8222-000000000002' where workspace_id=w and user_id=old_user;
 update public.memberships set role_id='22222222-2222-4222-8222-000000000001' where id=target;
 update public.workspaces set owner_user_id=target_user,version=version+1 where id=w;
 insert into public.audit_events(actor_id,action,resource,resource_id) values(old_user,'workspace.transfer_owner','workspace',w);
 return (select to_jsonb(t) from public.workspaces t where id=w);
end $$;

create function public.accept_trade_quote(qid uuid,rid uuid,expected int) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare q public.quotations; r public.quotation_revisions; l public.sell_listings;
 seller public.business_parties; buyer public.business_parties; c uuid:=public.app_workspace_id();
 oid uuid:=gen_random_uuid(); res_id uuid:=gen_random_uuid(); amount numeric; avail numeric; yr int:=extract(year from now()); seq bigint;
 line public.quotation_lines; payable numeric; total numeric; reserved boolean:=false;
begin
 if not public.actor_can(c,'quotations.accept') then raise exception 'PERMISSION_DENIED: Không có quyền chấp nhận báo giá.'; end if;
 select * into q from public.quotations where id=qid for update;
 if q.id is null or not public.actor_is_quote_party(qid) then raise exception 'PERMISSION_DENIED: Không tìm thấy báo giá.'; end if;
 if q.version<>expected or q.current_revision_id<>rid then raise exception 'VERSION_CONFLICT: Báo giá đã đổi.'; end if;
 select * into r from public.quotation_revisions where id=rid for update;
 if r.status not in('sent','countered') then raise exception 'INVALID_STATE_TRANSITION: Không thể chấp nhận phiên bản này.'; end if;
 if r.offered_by_workspace_id is null or r.offered_by_workspace_id=c then raise exception 'PERMISSION_DENIED: Không tự chấp nhận báo giá của mình.'; end if;
 if r.expires_at is not null and r.expires_at<=now() then raise exception 'QUOTE_EXPIRED: Báo giá hết hạn.'; end if;
 if not exists(select 1 from public.business_parties where id in(q.from_party_id,q.to_party_id) and workspace_id=c) then raise exception 'PERMISSION_DENIED: Sai workspace.'; end if;
 if q.listing_id is not null then
  select * into l from public.sell_listings where id=q.listing_id for update;
  if l.id is null or l.status<>'published' or l.deleted_at is not null or (l.expires_at is not null and l.expires_at<=now()) then raise exception 'INVALID_STATE_TRANSITION: Tin bán không còn hiệu lực.'; end if;
  select * into seller from public.business_parties where workspace_id=l.workspace_id;
 else select * into seller from public.business_parties where id=q.from_party_id; end if;
 if seller.id not in(q.from_party_id,q.to_party_id) then raise exception 'VALIDATION_FAILED: Tin bán không thuộc bên giao dịch.'; end if;
 select * into buyer from public.business_parties where id=case when seller.id=q.from_party_id then q.to_party_id else q.from_party_id end;
 select sum(qty) into amount from public.quotation_lines where revision_id=rid;
 if amount is null or amount<=0 then raise exception 'VALIDATION_FAILED: Báo giá rỗng.'; end if;
 if l.id is not null and (amount>l.qty or exists(select 1 from public.quotation_lines where revision_id=rid and commodity_id<>l.commodity_id)) then raise exception 'VALIDATION_FAILED: Dòng báo giá không khớp tin bán.'; end if;
 if l.harvest_lot_id is not null then
  select harvested_qty-reserved_qty-delivered_qty into avail from public.harvest_lots where id=l.harvest_lot_id and workspace_id=seller.workspace_id and status='open' for update;
  if avail is null or avail<amount then raise exception 'INSUFFICIENT_STOCK: Lô thu hoạch không đủ hàng.'; end if;
  update public.harvest_lots set reserved_qty=reserved_qty+amount,version=version+1 where id=l.harvest_lot_id; reserved:=true;
 elsif l.inventory_lot_id is not null then
  select qty_on_hand-qty_reserved into avail from public.inventory_lots where id=l.inventory_lot_id and workspace_id=seller.workspace_id for update;
  if avail is null or avail<amount then raise exception 'INSUFFICIENT_STOCK: Kho không đủ hàng.'; end if;
  update public.inventory_lots set qty_reserved=qty_reserved+amount,version=version+1 where id=l.inventory_lot_id; reserved:=true;
 end if;
 insert into public.document_sequences(workspace_id,book_year,kind,last_value) values(c,yr,'so',1) on conflict(workspace_id,book_year,kind) do update set last_value=document_sequences.last_value+1 returning last_value into seq;
 insert into public.trade_orders(id,status,source_quotation_revision_id,buyer_party_id,seller_party_id,issuer_workspace_id,document_no,terms_snapshot,confirmed_at,created_by)
 values(oid,'confirmed',rid,buyer.id,seller.id,c,'SO-'||yr||'-'||lpad(seq::text,5,'0'),jsonb_build_object('quotationId',qid,'revisionId',rid),now(),public.app_actor_id());
 insert into public.order_participants(order_id,party_id,workspace_id,side) values(oid,buyer.id,buyer.workspace_id,'buyer'),(oid,seller.id,seller.workspace_id,'seller');
 insert into public.workspace_order_views(workspace_id,order_id,direction) values(buyer.workspace_id,oid,'inbound'),(seller.workspace_id,oid,'outbound');
 for line in select * from public.quotation_lines where revision_id=rid loop
  payable:=case line.formula_type when 'rubberLatex' then line.qty*coalesce((line.formula_inputs->>'qualityPercent')::numeric,0)/100
   when 'lossPercent' then line.qty*(1-coalesce((line.formula_inputs->>'lossPercent')::numeric,0)/100)
   when 'netAfterTare' then line.qty-coalesce((line.formula_inputs->>'tareWeight')::numeric,0) else line.qty end;
  total:=round(round(round(greatest(0,payable),2)*line.unit_price,0)/1000)*1000;
  insert into public.order_lines(id,order_id,commodity_id,qty,unit,unit_price,formula_type,formula_inputs,line_total)
  values(gen_random_uuid(),oid,line.commodity_id,line.qty,line.unit,line.unit_price,line.formula_type,line.formula_inputs,total);
 end loop;
 if reserved then insert into public.stock_reservations(id,lot_id,harvest_lot_id,workspace_id,order_id,qty,status,expires_at)
 values(res_id,l.inventory_lot_id,l.harvest_lot_id,seller.workspace_id,oid,amount,'active',null); end if;
 update public.quotation_revisions set status='accepted' where id=rid;
 update public.quotations set version=version+1 where id=qid;
 if l.id is not null then update public.sell_listings set status=case when qty=amount then 'fulfilled' else status end,qty=case when qty=amount then qty else qty-amount end,version=version+1 where id=l.id; end if;
 insert into public.order_events(order_id,actor_id,type) values(oid,public.app_actor_id(),'quotation.accepted');
 return jsonb_build_object('orderId',oid,'status','confirmed','version',1,'reservation',case when reserved then jsonb_build_object('id',res_id,'qty',amount::text) else null end);
end $$;

create function public.cancel_trade_order(oid uuid,expected int) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare o public.trade_orders; r public.stock_reservations; begin
 if not public.actor_can(public.app_workspace_id(),'orders.cancel') or not public.actor_is_order_participant(oid) then raise exception 'PERMISSION_DENIED: Không đủ quyền.'; end if;
 select * into o from public.trade_orders where id=oid for update;
 if o.version<>expected then raise exception 'VERSION_CONFLICT: Đơn đã đổi.'; end if;
 if o.status not in('draft','pending_acceptance','confirmed') or exists(select 1 from public.acceptance_records a join public.fulfillments f on f.id=a.fulfillment_id where f.order_id=oid and a.posted) then raise exception 'INVALID_STATE_TRANSITION: Không thể hủy đơn đã nhận hàng.'; end if;
 for r in select * from public.stock_reservations where order_id=oid and status='active' order by id for update loop
  if r.harvest_lot_id is not null then update public.harvest_lots set reserved_qty=reserved_qty-(r.qty-r.consumed_qty),version=version+1 where id=r.harvest_lot_id; end if;
  if r.lot_id is not null then update public.inventory_lots set qty_reserved=qty_reserved-(r.qty-r.consumed_qty),version=version+1 where id=r.lot_id; end if;
  update public.stock_reservations set status='released' where id=r.id;
 end loop;
 update public.trade_orders set status='cancelled',version=version+1 where id=oid;
 return (select to_jsonb(t) from public.trade_orders t where id=oid);
end $$;

create function public.post_goods_acceptance(fid uuid,accepted numeric,rejected numeric) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare f public.fulfillments; o public.trade_orders; line public.order_lines; weight public.weighing_records;
 buyer public.business_parties; seller public.business_parties; wh uuid; inv uuid:=gen_random_uuid(); aid uuid:=gen_random_uuid();
 r public.stock_reservations; paid numeric; money numeric; previous numeric; total_received numeric; total_ordered numeric;
begin
 if not public.actor_can(public.app_workspace_id(),'fulfillments.accept') then raise exception 'PERMISSION_DENIED: Không đủ quyền nhận hàng.'; end if;
 -- Lock the order before the fulfillment, consistently with create/cancel commands.
 select * into o from public.trade_orders where id=(select order_id from public.fulfillments where id=fid) for update;
 if o.id is null or not public.actor_is_order_participant(o.id) then raise exception 'PERMISSION_DENIED: Không tìm thấy.'; end if;
 select * into buyer from public.business_parties where id=o.buyer_party_id;
 select * into seller from public.business_parties where id=o.seller_party_id;
 if buyer.workspace_id<>public.app_workspace_id() then raise exception 'PERMISSION_DENIED: Chỉ bên mua ghi nhận nghiệm thu.'; end if;
 select * into f from public.fulfillments where id=fid for update;
 if o.status not in('confirmed','in_fulfillment') or f.status not in('weighed','qc') then raise exception 'INVALID_STATE_TRANSITION: Không thể nghiệm thu trạng thái này.'; end if;
 select * into line from public.order_lines where id=f.order_line_id and order_id=o.id;
 if line.id is null then raise exception 'VALIDATION_FAILED: Thiếu dòng đơn hàng.'; end if;
 select * into weight from public.weighing_records where fulfillment_id=fid order by server_received_at desc,id desc limit 1;
 if weight.id is null or accepted<=0 or rejected<0 or accepted+rejected>weight.physical_qty or accepted+rejected>f.expected_qty then raise exception 'VALIDATION_FAILED: Khối lượng nghiệm thu không hợp lệ.'; end if;
 select coalesce(sum(a.qty_accepted),0) into previous from public.acceptance_records a join public.fulfillments x on x.id=a.fulfillment_id where x.order_line_id=line.id and a.posted;
 if previous+accepted>line.qty then raise exception 'VALIDATION_FAILED: Nhận vượt số lượng đặt hàng.'; end if;
 paid:=round(accepted*weight.payable_qty/nullif(weight.physical_qty,0),2);
 money:=round(round(paid*line.unit_price,0)/1000)*1000;
 insert into public.acceptance_records(id,fulfillment_id,qty_accepted,qty_rejected,posted,created_by) values(aid,fid,accepted,rejected,true,public.app_actor_id());
 select id into wh from public.warehouses where workspace_id=buyer.workspace_id order by id limit 1;
 if wh is null then raise exception 'VALIDATION_FAILED: Chưa có kho nhận hàng.'; end if;
 insert into public.inventory_lots(id,warehouse_id,workspace_id,commodity_id,qty_on_hand,origin,source_fulfillment_id) values(inv,wh,buyer.workspace_id,line.commodity_id,accepted,'purchase',fid);
 insert into public.stock_movements(lot_id,workspace_id,qty,reason,fulfillment_id,actor_id) values(inv,buyer.workspace_id,accepted,'receive',fid,public.app_actor_id());
 for r in select * from public.stock_reservations where order_id=o.id and status='active' order by id for update loop
  if r.qty-r.consumed_qty<accepted then raise exception 'INSUFFICIENT_STOCK: Vượt phần đã giữ chỗ.'; end if;
  if r.harvest_lot_id is not null then update public.harvest_lots set reserved_qty=reserved_qty-accepted,delivered_qty=delivered_qty+accepted,version=version+1 where id=r.harvest_lot_id; end if;
  if r.lot_id is not null then
   update public.inventory_lots set qty_reserved=qty_reserved-accepted,qty_on_hand=qty_on_hand-accepted,version=version+1 where id=r.lot_id;
   insert into public.stock_movements(lot_id,workspace_id,qty,reason,fulfillment_id,actor_id) values(r.lot_id,seller.workspace_id,-accepted,'ship',fid,public.app_actor_id());
  end if;
  update public.stock_reservations set consumed_qty=consumed_qty+accepted,status=case when consumed_qty+accepted=qty then 'consumed' else 'active' end where id=r.id;
 end loop;
 if money>0 then insert into public.receivable_payable_entries(id,workspace_id,party_id,side,amount,source,source_id,fulfillment_id)
 values(gen_random_uuid(),buyer.workspace_id,seller.id,'payable',money,'trade_order',o.id,fid),(gen_random_uuid(),seller.workspace_id,buyer.id,'receivable',money,'trade_order',o.id,fid); end if;
 update public.fulfillments set status=case when rejected>0 or accepted<f.expected_qty then 'partially_accepted' else 'accepted' end,version=version+1 where id=fid;
 select sum(qty) into total_ordered from public.order_lines where order_id=o.id;
 select sum(a.qty_accepted) into total_received from public.acceptance_records a join public.fulfillments x on x.id=a.fulfillment_id where x.order_id=o.id and a.posted;
 update public.trade_orders set status=case when total_received>=total_ordered then 'completed' else 'in_fulfillment' end,completed_at=case when total_received>=total_ordered then now() else null end,version=version+1 where id=o.id;
 return jsonb_build_object('acceptanceId',aid,'fulfillmentId',fid,'qtyAccepted',accepted::text,'amount',money::text,'inventoryLotId',inv,'posted',true);
end $$;

revoke all on function public.transfer_workspace_owner(uuid,uuid),public.accept_trade_quote(uuid,uuid,int),public.cancel_trade_order(uuid,int),public.post_goods_acceptance(uuid,numeric,numeric) from public,anon,authenticated;
grant execute on function public.transfer_workspace_owner(uuid,uuid),public.accept_trade_quote(uuid,uuid,int),public.cancel_trade_order(uuid,int),public.post_goods_acceptance(uuid,numeric,numeric) to mambo_app;

