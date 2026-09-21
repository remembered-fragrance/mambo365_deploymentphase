import { requireWorkspace } from './database';
import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { randomUUID } from 'node:crypto';
import { fail } from '../domain/errors';
import { listingTransition, locationPublishTransition } from '../domain/machines';
import { assertLngLat } from '../domain/geo';
import type { TxCtx } from './types';
import { Database, camel, one, personalCtx, uuid, type Sql } from './database';

export function decimal(raw: string, positive=true, scale=3): string {
 try { const n=new Decimal(raw); if(!n.isFinite()||n.lt(0)||(positive&&n.eq(0))||n.decimalPlaces()>scale||n.gte('1000000000000000')) throw new Error(); return n.toFixed(scale); }
 catch { return fail('VALIDATION_FAILED','Số tiền hoặc khối lượng không hợp lệ.'); }
}
export async function entitled(sql:Sql,workspaceId:string,code:string) {
 const [r]=await sql`select active from entitlements where workspace_id=${workspaceId} and code=${code}`;
 if(!r?.active) fail('PLAN_LIMIT_REACHED','Gói dịch vụ không cho phép thao tác này.');
}
@Injectable()
export class PgMarketplaceService {
 constructor(private readonly db:Database){}
 listFarms(ctx:TxCtx) {return this.db.run(ctx,'workspaces.read',async sql=>camel(await sql`select id,workspace_id,name,address_text,geo_visibility,version from farms where workspace_id=${requireWorkspace(ctx)} and deleted_at is null order by created_at desc limit 200`));}
 createFarm(ctx:TxCtx,input:{name:string;addressText?:string}) {return this.db.run(ctx,'farms.manage',async sql=>camel(one(await sql`insert into farms(id,workspace_id,name,address_text,created_by) values(${randomUUID()},${requireWorkspace(ctx)},${input.name},${input.addressText??null},${ctx.actorId}) returning id,workspace_id,name,address_text,geo_visibility,version`)));}
 createLot(ctx:TxCtx,farmId:string,input:{commodityId:string;harvestedQty:string}) {return this.db.run(ctx,'farms.manage',async sql=>{
   one(await sql`select id from farms where id=${uuid(farmId)} and workspace_id=${requireWorkspace(ctx)}`);
   return camel(one(await sql`insert into harvest_lots(id,farm_id,workspace_id,commodity_id,harvested_qty,created_by) values(${randomUUID()},${farmId},${requireWorkspace(ctx)},${uuid(input.commodityId)},${decimal(input.harvestedQty)},${ctx.actorId}) returning *`));
 });}
 createListing(ctx:TxCtx,input:{commodityId:string;qty:string;harvestLotId?:string;inventoryLotId?:string;desiredPrice?:string;deliveryMode?:string}) {return this.db.run(ctx,'listings.manage',async sql=>{
   if(input.harvestLotId&&input.inventoryLotId)fail('VALIDATION_FAILED','Chọn một nguồn hàng.');
   if(input.inventoryLotId)one(await sql`select id from inventory_lots where id=${uuid(input.inventoryLotId)} and workspace_id=${requireWorkspace(ctx)} and commodity_id=${uuid(input.commodityId)}`);
   if(input.harvestLotId) one(await sql`select id from harvest_lots where id=${uuid(input.harvestLotId)} and workspace_id=${requireWorkspace(ctx)} and commodity_id=${uuid(input.commodityId)}`);
   return camel(one(await sql`insert into sell_listings(id,workspace_id,harvest_lot_id,inventory_lot_id,commodity_id,qty,desired_price,delivery_mode,created_by) values(${randomUUID()},${requireWorkspace(ctx)},${input.harvestLotId??null},${input.inventoryLotId??null},${uuid(input.commodityId)},${decimal(input.qty)},${input.desiredPrice?decimal(input.desiredPrice,false,2):null},${input.deliveryMode??'either'},${ctx.actorId}) returning *`));
 });}
 listingAction(ctx:TxCtx,id:string,to:'published'|'paused'|'cancelled',expectedVersion?:number) {return this.db.run(ctx,'listings.manage',async sql=>{
   const l=one(await sql`select * from sell_listings where id=${uuid(id)} and workspace_id=${requireWorkspace(ctx)} for update`);
   if(expectedVersion!==undefined&&l.version!==expectedVersion)fail('VERSION_CONFLICT','Tin đã thay đổi.');
   listingTransition(l.status,to);
   if(to==='published') {
    await entitled(sql,requireWorkspace(ctx),'listings.publish');
    if(l.harvest_lot_id) {const lot=one(await sql`select * from harvest_lots where id=${l.harvest_lot_id} for update`);if(new Decimal(lot.harvested_qty).minus(lot.reserved_qty).minus(lot.delivered_qty).lt(l.qty)) fail('INSUFFICIENT_STOCK','Không đủ sản lượng.');}
   }
   const result=one(await sql`update sell_listings set status=${to},version=version+1 where id=${id} returning *`);
   await this.db.emit(sql,ctx,'listing.changed',id);return camel(result);
 });}
 createBuyRequest(ctx:TxCtx,input:{commodityId:string;qty:string}) {return this.db.run(ctx,'listings.manage',async sql=>camel(one(await sql`insert into buy_requests(id,workspace_id,commodity_id,qty,created_by) values(${randomUUID()},${requireWorkspace(ctx)},${uuid(input.commodityId)},${decimal(input.qty)},${ctx.actorId}) returning *`)));}
 browse(ctx:TxCtx,kind:'sell'|'buy',after?:string) {return this.db.run(ctx,'workspaces.read',async sql=>camel(await sql`select id,workspace_id,commodity_id,qty,unit,status,version from ${sql(kind==='sell'?'sell_listings':'buy_requests')} where status='published' and deleted_at is null and (${after??null}::uuid is null or id>${after??null}::uuid) order by id limit 100`));}
}

@Injectable()
export class PgLocationsService {
 constructor(private readonly db:Database){}
 async nearby(query:{lat:number;lng:number;radiusM?:number;commodityId?:string;limit?:number;cursor?:string}) {
   assertLngLat(query.lng,query.lat);const radius=query.radiusM??5000,limit=query.limit??20;
   if(!Number.isFinite(radius)||radius<=0||radius>50000||!Number.isInteger(limit)||limit<1||limit>100) fail('VALIDATION_FAILED','Bán kính hoặc số kết quả không hợp lệ.');
   if(query.commodityId) uuid(query.commodityId);
   let d:number|null=null,id:string|null=null;
   if(query.cursor) {try{const c=JSON.parse(Buffer.from(query.cursor,'base64url').toString());if(!Number.isFinite(c.d)||c.d<0)throw Error();d=c.d;id=uuid(c.id);}catch{fail('VALIDATION_FAILED','Cursor không hợp lệ.');}}
   return this.db.publicRead(async sql=>{
    const items=await sql`select l.id,l.name,st_y(l.geog::geometry) as lat,st_x(l.geog::geometry) as lng,
      st_distance(l.geog,st_setsrid(st_makepoint(${query.lng},${query.lat}),4326)::geography) as distance_m,
      exists(select 1 from procurement_capabilities c where c.location_id=l.id and c.pickup_available) as pickup_available,
      (select jsonb_build_object('amount',p.price::text,'unit',p.unit,'currency','VND','kind',p.price_kind,'validTo',p.valid_to,'lastUpdatedAt',p.valid_from) from price_quotes p where p.location_id=l.id and (${query.commodityId??null}::uuid is null or p.commodity_id=${query.commodityId??null}::uuid) and p.valid_from<=now() and (p.valid_to is null or p.valid_to>now()) order by p.valid_from desc,p.id limit 1) as current_price
      from locations l where l.publish_status='published' and l.deleted_at is null and l.type='procurement_point'
      and st_dwithin(l.geog,st_setsrid(st_makepoint(${query.lng},${query.lat}),4326)::geography,${radius})
      and (${query.commodityId??null}::uuid is null or exists(select 1 from procurement_capabilities c where c.location_id=l.id and c.commodity_id=${query.commodityId??null}::uuid))
      and (${d}::float8 is null or (st_distance(l.geog,st_setsrid(st_makepoint(${query.lng},${query.lat}),4326)::geography),l.id)>(${d}::float8,${id}::uuid)) order by distance_m,l.id limit ${limit+1}`;
    const page=items.slice(0,limit),last=page.at(-1);
    return {items:page.map(r=>({...camel(r),distanceM:Math.round(r.distance_m),distanceKind:'straight_line'})),nextCursor:items.length>limit&&last?Buffer.from(JSON.stringify({d:last.distance_m,id:last.id})).toString('base64url'):null};
   });
 }
 inBounds(q:{minLat:number;minLng:number;maxLat:number;maxLng:number}) {
   assertLngLat(q.minLng,q.minLat);assertLngLat(q.maxLng,q.maxLat);
   if(q.minLng>=q.maxLng||q.minLat>=q.maxLat||q.maxLng-q.minLng>2||q.maxLat-q.minLat>2) fail('VALIDATION_FAILED','Khung bản đồ không hợp lệ.');
   return this.db.publicRead(async sql=>({items:camel(await sql`select id,name,address_text,st_y(geog::geometry) as lat,st_x(geog::geometry) as lng from locations where publish_status='published' and deleted_at is null and geog::geometry && st_makeenvelope(${q.minLng},${q.minLat},${q.maxLng},${q.maxLat},4326) order by id limit 200`)}));
 }
 publicGet(id:string) {return this.db.publicRead(async sql=>{
   const l=one(await sql`select id,name,type,address_text,st_y(geog::geometry) as lat,st_x(geog::geometry) as lng,public_contact_name,public_phone,verification_status from locations where id=${uuid(id)} and publish_status='published' and deleted_at is null`);
   return {...camel(l),capabilities:camel(await sql`select commodity_id,pickup_available,min_qty,max_qty from procurement_capabilities where location_id=${id}`),hours:camel(await sql`select weekday,open_time,close_time,timezone,is_closed from location_hours where location_id=${id}`)};
 });}
 create(ctx:TxCtx,input:{name:string;addressText:string;type?:string;lat?:number;lng?:number;publicContactName?:string;publicPhone?:string}) {return this.db.run(ctx,'locations.manage',async sql=>{
   if(((input.lat === null || input.lat === undefined))!==((input.lng === null || input.lng === undefined))) fail('VALIDATION_FAILED','Cần đủ kinh độ/vĩ độ.');
   if((input.lat !== null && input.lat !== undefined)&&(input.lng !== null && input.lng !== undefined)) assertLngLat(input.lng,input.lat);
   return camel(one(await sql`insert into locations(id,workspace_id,type,name,address_text,geog,public_contact_name,public_phone,created_by) values(${randomUUID()},${requireWorkspace(ctx)},${input.type??'procurement_point'},${input.name},${input.addressText},case when ${input.lat??null}::float8 is null then null else st_setsrid(st_makepoint(${input.lng??null},${input.lat??null}),4326)::geography end,${input.publicContactName??null},${input.publicPhone??null},${ctx.actorId}) returning id,workspace_id,name,type,publish_status,version`));
 });}
 submitReview(ctx:TxCtx,id:string) {return this.db.run(ctx,'locations.publish',async sql=>{
   const l=one(await sql`select * from locations where id=${uuid(id)} and workspace_id=${requireWorkspace(ctx)} for update`);
   locationPublishTransition(l.publish_status,'pending_review');if(!l.geog) fail('VALIDATION_FAILED','Cần tọa độ.');await entitled(sql,requireWorkspace(ctx),'listings.publish');
   const r=one(await sql`update locations set publish_status='pending_review',version=version+1 where id=${id} returning id,publish_status,version`);await this.db.emit(sql,ctx,'location.submit_review',id);return camel(r);
 });}
 moderatePublish(ctx:TxCtx,id:string,decision:'published'|'rejected',reason?:string) {return this.db.run(ctx,null,async sql=>{
   const [admin]=await sql`select app_is_platform() as allowed`;if(!admin.allowed)fail('PERMISSION_DENIED','Chỉ quản trị nền tảng được duyệt.');
   const l=one(await sql`select * from locations where id=${uuid(id)} for update`);
   const [own]=await sql`select actor_owns_workspace(${l.workspace_id}) as owns`;if(own.owns)fail('PERMISSION_DENIED','Không tự duyệt điểm.');
   locationPublishTransition(l.publish_status,decision);
   const r=one(await sql`update locations set publish_status=${decision},rejection_reason=${reason??null},version=version+1 where id=${id} returning id,publish_status,version`);await this.db.emit(sql,ctx,'location.moderated',id);return camel(r);
 });}
 addPriceQuote(ctx:TxCtx,locationId:string,input:{commodityId:string;price:string;validFrom:string;validTo?:string;priceKind?:string}) {return this.db.run(ctx,'locations.manage',async sql=>{
   one(await sql`select id from locations where id=${uuid(locationId)} and workspace_id=${requireWorkspace(ctx)}`);
   return camel(one(await sql`insert into price_quotes(id,location_id,workspace_id,commodity_id,price,price_kind,valid_from,valid_to,created_by) values(${randomUUID()},${locationId},${requireWorkspace(ctx)},${uuid(input.commodityId)},${decimal(input.price,false,2)},${input.priceKind??'reference'},${input.validFrom},${input.validTo??null},${ctx.actorId}) returning *`));
 });}
 setCapability(ctx:TxCtx,locationId:string,input:{commodityId:string;pickupAvailable:boolean}) {return this.db.run(ctx,'locations.manage',async sql=>{
   one(await sql`select id from locations where id=${uuid(locationId)} and workspace_id=${requireWorkspace(ctx)} for update`);
   const [old]=await sql`select id from procurement_capabilities where location_id=${locationId} and commodity_id=${uuid(input.commodityId)} and grade_id is null`;
   if(old) return camel(one(await sql`update procurement_capabilities set pickup_available=${input.pickupAvailable} where id=${old.id} returning *`));
   return camel(one(await sql`insert into procurement_capabilities(id,location_id,workspace_id,commodity_id,pickup_available) values(${randomUUID()},${locationId},${requireWorkspace(ctx)},${input.commodityId},${input.pickupAvailable}) returning *`));
 });}
 follow(userId:string,locationId:string,on:boolean) {return this.db.run(personalCtx(userId),null,async sql=>{
   one(await sql`select id from locations where id=${uuid(locationId)} and publish_status='published' and deleted_at is null`);
   if(on)await sql`insert into follows(user_id,location_id) values(${userId},${locationId}) on conflict do nothing`;else await sql`delete from follows where user_id=${userId} and location_id=${locationId}`;
   return {following:on};
 });}
}

@Injectable()
export class PgInventoryService {
 constructor(private readonly db:Database){}
 lots(ctx:TxCtx) {return this.db.run(ctx,'inventory.manage',async sql=>camel(await sql`select * from inventory_lots where workspace_id=${requireWorkspace(ctx)} order by created_at desc limit 200`));}
 availability(ctx:TxCtx) {return this.db.run(ctx,'inventory.manage',async sql=>camel(await sql`select warehouse_id,commodity_id,sum(qty_on_hand)::text as on_hand,sum(qty_reserved)::text as reserved,sum(qty_on_hand-qty_reserved)::text as available from inventory_lots where workspace_id=${requireWorkspace(ctx)} group by warehouse_id,commodity_id`));}
}
