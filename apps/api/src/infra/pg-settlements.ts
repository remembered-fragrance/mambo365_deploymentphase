import { requireWorkspace } from './database';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { fail } from '../domain/errors';
import type { TxCtx } from './types';
import { Database, camel, one, uuid, type Sql } from './database';
import { decimal } from './pg-market';

async function settlement(sql:Sql,ctx:TxCtx,id:string) {return one(await sql`select * from settlements where id=${uuid(id)} and workspace_id=${requireWorkspace(ctx)} for update`);}
@Injectable()
export class PgSettlementsService {
 constructor(private readonly db:Database){}
 declare(ctx:TxCtx,input:{direction:'in'|'out';amount:string;valueDate:string;operationId?:string}) {
  const payload={direction:input.direction,amount:decimal(input.amount,true,0),valueDate:input.valueDate};
  if(!['in','out'].includes(payload.direction)||!/^\d{4}-\d{2}-\d{2}$/.test(payload.valueDate))fail('VALIDATION_FAILED','Ngày hoặc chiều thanh toán không hợp lệ.');
  return this.db.command(ctx,input.operationId??'','settlement.declare',payload,async sql=>{
   await this.db.member(sql,ctx,'settlements.declare');
   const r=one(await sql`insert into settlements(id,workspace_id,direction,amount,status,declared_by,value_date) values(${randomUUID()},${requireWorkspace(ctx)},${payload.direction},${payload.amount},'declared',${ctx.actorId},${payload.valueDate}) returning *`);await this.db.emit(sql,ctx,'settlement.declared',r.id);return camel(r);
  });
 }
 confirm(ctx:TxCtx,id:string){return this.db.run(ctx,'settlements.confirm',async sql=>{
  const s=await settlement(sql,ctx,id);if(s.status!=='declared')fail('INVALID_STATE_TRANSITION','Khoản thanh toán không còn chờ xác nhận.');
  if(s.declared_by===ctx.actorId)fail('PERMISSION_DENIED','Người lập không tự xác nhận khoản thanh toán.');
  await sql`insert into settlement_confirmations(id,settlement_id,kind,by_user_id) values(${randomUUID()},${id},'institutional',${ctx.actorId})`;
  const r=one(await sql`update settlements set status='posted',version=version+1 where id=${id} returning *`);await this.db.emit(sql,ctx,'settlement.posted',id);return camel(r);
 });}
 reject(ctx:TxCtx,id:string){return this.db.run(ctx,'settlements.confirm',async sql=>{
  const s=await settlement(sql,ctx,id);if(s.status!=='declared')fail('INVALID_STATE_TRANSITION','Khoản thanh toán đã xử lý.');
  const r=one(await sql`update settlements set status='rejected',version=version+1 where id=${id} returning *`);await this.db.emit(sql,ctx,'settlement.rejected',id);return camel(r);
 });}
 allocate(ctx:TxCtx,id:string,input:{entryId?:string;orderId?:string;amount:string;operationId?:string}) {
  const payload={id:uuid(id),entryId:input.entryId?uuid(input.entryId):null,orderId:input.orderId?uuid(input.orderId):null,amount:decimal(input.amount,true,0)};
  if(!payload.entryId)fail('VALIDATION_FAILED','Chọn dòng công nợ cụ thể để phân bổ.');
  return this.db.command(ctx,input.operationId??'','settlement.allocate',payload,async sql=>{
   await this.db.member(sql,ctx,'settlements.allocate');const s=await settlement(sql,ctx,id);
   if(s.status!=='posted')fail('INVALID_STATE_TRANSITION','Khoản thanh toán chưa được xác nhận.');
   const e=one(await sql`select * from receivable_payable_entries where id=${payload.entryId} and workspace_id=${requireWorkspace(ctx)} for update`);
   if((s.direction==='in')!==(e.side==='receivable')||(payload.orderId&&payload.orderId!==e.source_id))fail('VALIDATION_FAILED','Sai chiều thanh toán hoặc đơn hàng.');
   const [used]=await sql`select coalesce(sum(amount),0)::text as n from settlement_allocations where settlement_id=${id}`;
   const [paid]=await sql`select coalesce(sum(a.amount),0)::text as n from settlement_allocations a join settlements s on s.id=a.settlement_id where a.entry_id=${payload.entryId} and s.status='posted'`;
   if(new Decimal(used.n).plus(payload.amount).gt(s.amount)||new Decimal(paid.n).plus(payload.amount).gt(e.amount))fail('VALIDATION_FAILED','Phân bổ vượt thanh toán hoặc số công nợ.');
   const r=one(await sql`insert into settlement_allocations(id,settlement_id,workspace_id,entry_id,order_id,amount) values(${randomUUID()},${id},${requireWorkspace(ctx)},${payload.entryId},${payload.orderId},${payload.amount}) returning *`);
   await sql`update receivable_payable_entries set status=${new Decimal(paid.n).plus(payload.amount).eq(e.amount)?'closed':'open'} where id=${payload.entryId}`;
   await this.db.emit(sql,ctx,'settlement.allocated',id);return camel(r);
  });
 }
 reverse(ctx:TxCtx,id:string,reason:string){return this.db.run(ctx,'settlements.reverse',async sql=>{
  if(!reason?.trim()||reason.length>1000)fail('VALIDATION_FAILED','Cần lý do đảo bút toán.');
  const s=await settlement(sql,ctx,id);if(s.status!=='posted')fail('INVALID_STATE_TRANSITION','Chỉ đảo khoản đã ghi sổ.');
  // Lock affected entries in stable order; allocations remain immutable for audit.
  const entries=await sql`select e.id from receivable_payable_entries e where e.id in(select entry_id from settlement_allocations where settlement_id=${id}) order by e.id for update`;
  await sql`insert into reversals(id,target_type,target_id,workspace_id,reason,actor_id) values(${randomUUID()},'settlement',${id},${requireWorkspace(ctx)},${reason.trim()},${ctx.actorId})`;
  const r=one(await sql`update settlements set status='reversed',version=version+1 where id=${id} returning *`);
  for(const e of entries)await sql`update receivable_payable_entries set status='open' where id=${e.id}`;
  await this.db.emit(sql,ctx,'settlement.reversed',id);return camel(r);
 });}
 debts(ctx:TxCtx,filter?:'due'|'overdue'){return this.db.run(ctx,'export.financial',async sql=>camel(await sql`select e.*, (e.amount-coalesce((select sum(a.amount) from settlement_allocations a join settlements s on s.id=a.settlement_id where a.entry_id=e.id and s.status='posted'),0))::text as remaining from receivable_payable_entries e where e.workspace_id=${requireWorkspace(ctx)} and (${filter??null}::text is null or (${filter??null}='overdue' and e.due_date<current_date) or (${filter??null}='due' and e.due_date<=current_date)) order by e.created_at desc limit 200`));}
}
