import { requireWorkspace } from './database';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { fail, must } from '../domain/errors';
import { appointmentTransition, orderTransition } from '../domain/machines';
import { lineNetWeight, type FormulaType } from '../domain/money';
import type { TxCtx, Appointment } from './types';
import { Database, camel, one, uuid, type Sql, type Row } from './database';
import { decimal } from './pg-market';

type QuoteInput={listingId?:string;buyRequestId?:string;toWorkspaceId:string;expiresAt?:string;lines:Array<{commodityId:string;qty:string;unitPrice:string;formulaType?:FormulaType;formulaInputs?:Record<string,string>}>};
const formulas=['standard','netAfterTare','rubberLatex','lossPercent'];
async function quote(sql:Sql,ctx:TxCtx,id:string) {
 const q=one(await sql`select q.* from quotations q where q.id=${uuid(id)} and exists(select 1 from business_parties b where b.id in(q.from_party_id,q.to_party_id) and b.workspace_id=${requireWorkspace(ctx)}) for update`);
 return q;
}
async function addRevision(sql:Sql,ctx:TxCtx,qid:string,n:number,status:string,input:Pick<QuoteInput,'lines'|'expiresAt'>) {
 if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>100) fail('VALIDATION_FAILED','Cần từ 1 đến 100 dòng báo giá.');
 if(input.expiresAt&&(!Number.isFinite(Date.parse(input.expiresAt))||Date.parse(input.expiresAt)<=Date.now())) fail('VALIDATION_FAILED','Hạn báo giá không hợp lệ.');
 const id=randomUUID();
 const revision=one(await sql`insert into quotation_revisions(id,quotation_id,revision_no,status,expires_at,created_by,offered_by_workspace_id) values(${id},${qid},${n},${status},${input.expiresAt??null},${ctx.actorId},${requireWorkspace(ctx)}) returning *`);
 for(const l of input.lines) {
   const type=l.formulaType??'standard',inputs=l.formulaInputs??{};if(!formulas.includes(type))fail('VALIDATION_FAILED','Công thức không hợp lệ.');
   const qty=decimal(l.qty),price=decimal(l.unitPrice,false,2);
   for(const key of Object.keys(inputs)) if(!['tareWeight','qualityPercent','lossPercent'].includes(key)) fail('VALIDATION_FAILED','Tham số công thức không hợp lệ.');
   if(type==='rubberLatex'||type==='lossPercent') {const p=decimal(inputs[type==='rubberLatex'?'qualityPercent':'lossPercent'],false,3);if(new Decimal(p).gt(100))fail('VALIDATION_FAILED','Tỷ lệ vượt 100%.');}
   if(inputs.tareWeight&&new Decimal(decimal(inputs.tareWeight,false)).gt(qty))fail('VALIDATION_FAILED','Bì vượt khối lượng.');
   await sql`insert into quotation_lines(id,revision_id,commodity_id,qty,unit_price,formula_type,formula_inputs) values(${randomUUID()},${id},${uuid(l.commodityId)},${qty},${price},${type},${sql.json(inputs)})`;
 }
 await sql`update quotations set current_revision_id=${id} where id=${qid}`;
 return camel(revision);
}
@Injectable()
export class PgQuotationsService {
 constructor(private readonly db:Database){}
 create(ctx:TxCtx,input:QuoteInput) {return this.db.run(ctx,'quotations.send',async sql=>{
  const from=one(await sql`select id from business_parties where workspace_id=${requireWorkspace(ctx)}`),to=one(await sql`select id from business_parties where workspace_id=${uuid(input.toWorkspaceId)}`);
  if(from.id===to.id)fail('VALIDATION_FAILED','Không tự báo giá cho mình.');
  if(input.buyRequestId)fail('VALIDATION_FAILED','Báo giá P0 nhận tin bán hoặc giao dịch trực tiếp.');
  if(input.listingId) {const l=one(await sql`select workspace_id from sell_listings where id=${uuid(input.listingId)} and status='published' and deleted_at is null`);if(![ctx.workspaceId,input.toWorkspaceId].includes(l.workspace_id))fail('VALIDATION_FAILED','Tin bán không thuộc đối tác.');}
  const id=randomUUID();
  await sql`insert into quotations(id,listing_id,from_party_id,to_party_id,created_by) values(${id},${input.listingId??null},${from.id},${to.id},${ctx.actorId})`;
  const revision=await addRevision(sql,ctx,id,1,'draft',input);
  return {quotation:camel(one(await sql`select * from quotations where id=${id}`)),revision};
 });}
 send(ctx:TxCtx,id:string){return this.db.run(ctx,'quotations.send',async sql=>{
  const q=await quote(sql,ctx,id),r=one(await sql`select * from quotation_revisions where id=${q.current_revision_id} for update`);
  if(r.offered_by_workspace_id!==ctx.workspaceId)fail('PERMISSION_DENIED','Chỉ bên lập được gửi báo giá.');
  if(r.status!=='draft')fail('INVALID_STATE_TRANSITION','Chỉ gửi bản nháp.');
  const revision=one(await sql`update quotation_revisions set status='sent' where id=${r.id} returning *`);await this.db.emit(sql,ctx,'quotation.sent',id,{quotationId:id});
  return {quotation:camel(q),revision:camel(revision)};
 });}
 counter(ctx:TxCtx,id:string,input:{expectedVersion:number;lines:QuoteInput['lines'];expiresAt?:string}){return this.db.run(ctx,'quotations.send',async sql=>{
  const q=await quote(sql,ctx,id);if(q.version!==input.expectedVersion)fail('VERSION_CONFLICT','Báo giá đã đổi.');
  const r=one(await sql`select * from quotation_revisions where id=${q.current_revision_id}`);
  if(!['sent','countered'].includes(r.status))fail('INVALID_STATE_TRANSITION','Không thể trả giá.');
  if(r.offered_by_workspace_id===ctx.workspaceId)fail('PERMISSION_DENIED','Chờ bên nhận phản hồi.');
  const revision=await addRevision(sql,ctx,id,r.revision_no+1,'countered',input);
  const next=one(await sql`update quotations set version=version+1 where id=${id} returning *`);await this.db.emit(sql,ctx,'quotation.countered',id,{quotationId:id});return {quotation:camel(next),revision};
 });}
 accept(ctx:TxCtx,id:string,input:{revisionId:string;expectedVersion:number;operationId?:string;idempotencyKey?:string}) {
  const payload={id:uuid(id),revisionId:uuid(input.revisionId),expectedVersion:input.expectedVersion};
  return this.db.command(ctx,input.operationId??input.idempotencyKey??'','quotation.accept',payload,async sql=>{
    await this.db.member(sql,ctx,'quotations.accept');
    const r=one(await sql`select accept_trade_quote(${id},${input.revisionId},${input.expectedVersion}) as result`).result;
    await this.db.emit(sql,ctx,'quotation.accepted',r.orderId,{orderId:r.orderId});return r;
  });
 }
 rejectOrWithdraw(ctx:TxCtx,id:string,action:'rejected'|'withdrawn'){return this.db.run(ctx,action==='withdrawn'?'quotations.send':'quotations.accept',async sql=>{
  const q=await quote(sql,ctx,id),r=one(await sql`select * from quotation_revisions where id=${q.current_revision_id}`);
  if(!['sent','countered'].includes(r.status))fail('INVALID_STATE_TRANSITION','Báo giá không còn chờ phản hồi.');
  if((action==='withdrawn')!==(r.offered_by_workspace_id===ctx.workspaceId))fail('PERMISSION_DENIED','Sai bên phản hồi.');
  const revision=one(await sql`update quotation_revisions set status=${action} where id=${r.id} returning *`),q2=one(await sql`update quotations set version=version+1 where id=${id} returning *`);
  await this.db.emit(sql,ctx,'quotation.'+action,id,{quotationId:id});return {quotation:camel(q2),revision:camel(revision)};
 });}
 list(ctx:TxCtx){return this.db.run(ctx,'workspaces.read',async sql=>camel(await sql`select q.*,r.status from quotations q join quotation_revisions r on r.id=q.current_revision_id where exists(select 1 from business_parties b where b.workspace_id=${requireWorkspace(ctx)} and b.id in(q.from_party_id,q.to_party_id)) order by q.created_at desc limit 100`));}
}

async function order(sql:Sql,ctx:TxCtx,id:string,lock=false) {
 return one(await sql`select o.* from trade_orders o join order_participants p on p.order_id=o.id where o.id=${uuid(id)} and p.workspace_id=${requireWorkspace(ctx)} ${lock?sql`for update of o`:sql``}`);
}
async function project(sql:Sql,ctx:TxCtx,o:Row) {
 const internal=await sql`select direction,internal_status,seller_cost from workspace_order_views where workspace_id=${requireWorkspace(ctx)} and order_id=${o.id}`;
 return {...camel(o),lines:camel(await sql`select * from order_lines where order_id=${o.id} order by id`),internal:camel(internal[0]??null)};
}
@Injectable()
export class PgOrdersService {
 constructor(private readonly db:Database){}
 closeRemainder(ctx:TxCtx,id:string,version:number,reason:string){return this.db.run(ctx,'orders.cancel',async sql=>{
  const r=one(await sql`select close_trade_remainder(${uuid(id)},${version},${reason}) as result`).result;
  await this.db.emit(sql,ctx,'order.remainder_closed',id,{orderId:id,reason});return camel(r);
 });}
 list(ctx:TxCtx,role?:'buyer'|'seller') {return this.db.run(ctx,'workspaces.read',async sql=>camel(await sql`select o.* from trade_orders o join order_participants p on p.order_id=o.id where p.workspace_id=${requireWorkspace(ctx)} and (${role??null}::text is null or p.side=${role??null}) order by o.created_at desc limit 100`));}
 get(ctx:TxCtx,id:string){return this.db.run(ctx,'workspaces.read',async sql=>project(sql,ctx,await order(sql,ctx,id)));}
 confirm(ctx:TxCtx,id:string,version:number){return this.db.run(ctx,'orders.confirm',async sql=>{
  const o=await order(sql,ctx,id,true);if(o.version!==version)fail('VERSION_CONFLICT','Đơn đã đổi.');orderTransition(o.status,'confirmed');
  const result=one(await sql`update trade_orders set status='confirmed',version=version+1,confirmed_at=now() where id=${id} returning *`);await this.db.emit(sql,ctx,'order.confirmed',id,{orderId:id});return project(sql,ctx,result);
 });}
 cancel(ctx:TxCtx,id:string,version:number){return this.db.run(ctx,'orders.cancel',async sql=>{await order(sql,ctx,id);const r=one(await sql`select cancel_trade_order(${id},${version}) as result`).result;await this.db.emit(sql,ctx,'order.cancelled',id,{orderId:id});return camel(r);});}
 proposeAppointment(ctx:TxCtx,input:{orderId:string;locationId:string;proposedAt:string}) {return this.db.run(ctx,'appointments.manage',async sql=>{
  await order(sql,ctx,input.orderId,true);one(await sql`select id from locations where id=${uuid(input.locationId)} and deleted_at is null`);
  if(!Number.isFinite(Date.parse(input.proposedAt))||Date.parse(input.proposedAt)<=Date.now())fail('VALIDATION_FAILED','Lịch phải ở tương lai.');
  const r=one(await sql`insert into appointments(id,order_id,location_id,proposed_at,status,created_by) values(${randomUUID()},${input.orderId},${input.locationId},${input.proposedAt},'proposed',${ctx.actorId}) returning *`);await this.db.emit(sql,ctx,'appointment.changed',r.id,{orderId:input.orderId});return camel(r);
 });}
 appointmentAction(ctx:TxCtx,id:string,to:Appointment['status'],expectedVersion?:number){return this.db.run(ctx,'appointments.manage',async sql=>{
  const a=one(await sql`select * from appointments where id=${uuid(id)} for update`);await order(sql,ctx,a.order_id);
  if((expectedVersion !== null && expectedVersion !== undefined)&&a.version!==expectedVersion)fail('VERSION_CONFLICT','Lịch đã đổi.');appointmentTransition(a.status,to);
  const r=one(await sql`update appointments set status=${to},version=version+1 where id=${id} returning *`);await this.db.emit(sql,ctx,'appointment.changed',id,{orderId:a.order_id});return camel(r);
 });}
}

@Injectable()
export class PgReceivingService {
 constructor(private readonly db:Database){}
 createFulfillment(ctx:TxCtx,orderId:string,input:{expectedQty:string;orderLineId?:string}){return this.db.run(ctx,'fulfillments.weigh',async sql=>{
  const o=await order(sql,ctx,orderId,true);if(!['confirmed','in_fulfillment'].includes(o.status))fail('INVALID_STATE_TRANSITION','Đơn không còn nhận hàng.');
  const lines=await sql`select * from order_lines where order_id=${orderId}`;
  const line=must(input.orderLineId?lines.find(x=>x.id===input.orderLineId):lines.length===1?lines[0]:undefined,'Cần chọn dòng hàng.','VALIDATION_FAILED');
  const qty=decimal(input.expectedQty);if(new Decimal(qty).gt(line.qty))fail('VALIDATION_FAILED','Vượt số lượng dòng hàng.');
  const [n]=await sql`select coalesce(max(sequence),0)+1 as n from fulfillments where order_id=${orderId}`;
  return camel(one(await sql`insert into fulfillments(id,order_id,order_line_id,sequence,expected_qty,status,created_by) values(${randomUUID()},${orderId},${line.id},${n.n},${qty},'expected',${ctx.actorId}) returning *`));
 });}
 weigh(ctx:TxCtx,id:string,input:{grossWeight:string;tareWeight?:string;formulaType?:FormulaType;qualityPercent?:string;lossPercent?:string}){return this.db.run(ctx,'fulfillments.weigh',async sql=>{
  const f=one(await sql`select * from fulfillments where id=${uuid(id)} for update`);await order(sql,ctx,f.order_id);
  if(f.status!=='expected')fail('INVALID_STATE_TRANSITION','Đã cân hoặc đã nghiệm thu.');
  const l=one(await sql`select * from order_lines where id=${f.order_line_id}`);
  if(input.formulaType&&input.formulaType!==l.formula_type)fail('VALIDATION_FAILED','Phải dùng công thức đã thỏa thuận.');
  const gross=decimal(input.grossWeight),tare=decimal(input.tareWeight??'0',false);if(new Decimal(tare).gt(gross))fail('VALIDATION_FAILED','Bì vượt tổng.');
  const qp=input.qualityPercent??l.formula_inputs.qualityPercent,lp=input.lossPercent??l.formula_inputs.lossPercent;
  for(const p of [qp,lp])if((p !== null && p !== undefined)&&new Decimal(decimal(p,false)).gt(100))fail('VALIDATION_FAILED','Tỷ lệ vượt 100%.');
  // Physical stock excludes packaging; quality only changes the payable quantity.
  const physical=new Decimal(gross).minus(tare);
  const payable=lineNetWeight({formulaType:l.formula_type,grossWeight:l.formula_type==='netAfterTare'?gross:physical.toString(),tareWeight:tare,qualityPercent:qp,lossPercent:lp});
  if(physical.lte(0))fail('VALIDATION_FAILED','Khối lượng tịnh phải dương.');
  const r=one(await sql`insert into weighing_records(id,fulfillment_id,gross_weight,tare_weight,formula_type,formula_inputs,physical_qty,payable_qty,created_by) values(${randomUUID()},${id},${gross},${tare},${l.formula_type},${sql.json({qualityPercent:qp??null,lossPercent:lp??null})},${physical.toFixed(3)},${payable.toFixed(3)},${ctx.actorId}) returning *`);
  await sql`update fulfillments set status='weighed',version=version+1 where id=${id}`;return camel(r);
 });}
 qualityCheck(ctx:TxCtx,id:string,_input:unknown){return this.db.run(ctx,'fulfillments.accept',async sql=>{
  const f=one(await sql`select * from fulfillments where id=${uuid(id)} for update`);await order(sql,ctx,f.order_id);if(f.status!=='weighed')fail('INVALID_STATE_TRANSITION','Chưa cân hàng.');
  await sql`insert into quality_checks(id,fulfillment_id,created_by) values(${randomUUID()},${id},${ctx.actorId})`;
  return camel(one(await sql`update fulfillments set status='qc',version=version+1 where id=${id} returning *`));
 });}
 accept(ctx:TxCtx,id:string,input:{qtyAccepted:string;qtyRejected?:string;operationId?:string}) {
  const payload={id:uuid(id),accepted:decimal(input.qtyAccepted),rejected:decimal(input.qtyRejected??'0',false)};
  return this.db.command(ctx,input.operationId??'','fulfillment.accept',payload,async sql=>{
   await this.db.member(sql,ctx,'fulfillments.accept');const r=one(await sql`select post_goods_acceptance(${id},${payload.accepted}::numeric,${payload.rejected}::numeric) as result`).result;
   const f=one(await sql`select order_id from fulfillments where id=${id}`);await this.db.emit(sql,ctx,'fulfillment.accepted',id,{orderId:f.order_id});return r;
  });
 }
 reject(ctx:TxCtx,id:string,reason:string){return this.db.run(ctx,'fulfillments.accept',async sql=>{
  const f=one(await sql`select * from fulfillments where id=${uuid(id)} for update`),o=await order(sql,ctx,f.order_id);
  const buyer=one(await sql`select workspace_id from business_parties where id=${o.buyer_party_id}`);if(buyer.workspace_id!==ctx.workspaceId)fail('PERMISSION_DENIED','Chỉ bên mua từ chối nhận.');
  if(!['expected','weighed','qc'].includes(f.status))fail('INVALID_STATE_TRANSITION','Đợt giao đã chốt.');
  const r=one(await sql`update fulfillments set status='rejected',version=version+1 where id=${id} returning *`);await this.db.emit(sql,ctx,'fulfillment.rejected',id,{orderId:o.id,reason});return camel(r);
 });}
}
