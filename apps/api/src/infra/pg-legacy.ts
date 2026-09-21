import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { fail } from '../domain/errors';
import { Database, one, uuid, type Row } from './database';
import type { TxCtx } from './types';
import { decimal } from './pg-market';
import { lineMoney, type FormulaType } from '../domain/money';

const FIELDS:Record<string,string[]>={
 suppliers:['name','phone','location','note'],buyers:['name','phone','location','note'],
 products:['name','unit','formula_type','is_suggested','is_active','crop','last_price_per_unit','group','quality_grades','track_inventory'],
 transactions:['date','kind','counterparty_id','supplier_id','supplier_name','lines','credit_terms','adjustments','attachment_ids','note'],
 payments:['transaction_id','date','amount','note'],
 drafts:['status','kind','counterparty_id','supplier_id','supplier_name','lines','amount_paid','note','attachment_ids'],
 pricing_rules:['name','kind','product_id','fixed_amount','percent_of_total','min_weight_kg','applies_on_pickup','active'],notes:['body','pinned','done'],
};
const JSON_FIELDS=new Set(['lines','credit_terms','adjustments']);
export interface LegacyCommand {operationId:string;table:string;kind:'insert'|'update'|'softDelete';recordId:string;payload:Row;expectedVersion?:number;}
@Injectable()
export class PgLegacyService {
 constructor(private readonly db:Database){}
 claim(ctx:TxCtx){return this.db.run(ctx,null,async sql=>{await sql`update profiles set api_migrated_at=coalesce(api_migrated_at,now()) where id=${ctx.actorId}`;return {transport:'api',cursor:'0'};});}
 command(ctx:TxCtx,cmd:LegacyCommand){
  const fields=FIELDS[cmd.table];if(!fields||!['insert','update','softDelete'].includes(cmd.kind))fail('VALIDATION_FAILED','Bảng hoặc thao tác không hợp lệ.');
  uuid(cmd.operationId);uuid(cmd.recordId);
  if(!cmd.payload||typeof cmd.payload!=='object'||Array.isArray(cmd.payload))fail('VALIDATION_FAILED','Nội dung không hợp lệ.');
  if(cmd.payload.user_id&&cmd.payload.user_id!==ctx.actorId)fail('PERMISSION_DENIED','Sai tài khoản trong hàng đợi.');
  return this.db.command(ctx,cmd.operationId,'legacy.'+cmd.table+'.'+cmd.kind,cmd,async sql=>{
   const [plan]=await sql`select has_active_sync(${ctx.actorId}) as allowed`;if(!plan.allowed)fail('PLAN_LIMIT_REACHED','Gói đồng bộ đã hết hạn.');
   // Serialize a user's legacy writes before taking child-row locks.
   await sql`select pg_advisory_xact_lock(hashtextextended(${ctx.actorId+':legacy'},0))`;
   const [existing]=await sql`select * from ${sql(cmd.table)} where id=${cmd.recordId} and user_id=${ctx.actorId} for update`;
   if(cmd.kind==='insert'&&existing)fail('VERSION_CONFLICT','ID đã tồn tại với lệnh khác.');
   if(cmd.kind!=='insert'&&!existing)fail('PERMISSION_DENIED','Không tìm thấy bản ghi.');
   if(existing?.deleted_at)fail('VERSION_CONFLICT','Bản ghi đã xóa; không thể hồi sinh.');
   if(cmd.kind==='update'&&['transactions','payments'].includes(cmd.table)) {
    const permitted=cmd.table==='transactions'?['attachment_ids','note']:['note'];
    if(Object.keys(cmd.payload).some(k=>!['id','user_id',...permitted].includes(k)))fail('INVALID_STATE_TRANSITION','Chứng từ đã chốt không được sửa tiền hoặc dòng hàng.');
   }
   const clean:Row={};
   for(const [k,v] of Object.entries(cmd.payload)) {
    if(['id','user_id','created_at','updated_at','deleted_at'].includes(k))continue;
    if(!fields.includes(k))fail('VALIDATION_FAILED','Trường không cho phép: '+k);
    if(typeof v==='string'&&v.length>10000)fail('VALIDATION_FAILED','Nội dung quá dài.');
    clean[k]=v;
   }
   if(clean.counterparty_id)one(await sql`select id from ${sql(clean.kind==='sale'?'buyers':'suppliers')} where id=${uuid(clean.counterparty_id)} and user_id=${ctx.actorId} and deleted_at is null`);
   if(cmd.table==='payments'&&cmd.kind==='insert') {
    clean.amount=decimal(String(clean.amount),true,0);
    const receipt=one(await sql`select lines,adjustments from transactions where id=${uuid(clean.transaction_id)} and user_id=${ctx.actorId} and deleted_at is null for update`);
    const total=receiptTotal(receipt.lines,receipt.adjustments);
    const [paid]=await sql`select coalesce(sum(amount),0)::text as n from payments where transaction_id=${clean.transaction_id} and user_id=${ctx.actorId} and deleted_at is null`;
    if(new Decimal(paid.n).plus(clean.amount).gt(total))fail('VALIDATION_FAILED','Thanh toán vượt tổng phiếu.');
   }
   if(cmd.table==='transactions'&&cmd.kind==='insert') {
    if(!Array.isArray(clean.lines)||!clean.lines.length||clean.lines.length>100)fail('VALIDATION_FAILED','Phiếu cần dòng hàng.');
    clean.lines=clean.lines.map((line:Row)=>{
     if(!['standard','netAfterTare','rubberLatex','lossPercent'].includes(line.formulaType))fail('VALIDATION_FAILED','Sai công thức.');
     const gross=decimal(String(line.grossWeight)),price=decimal(String(line.pricePerUnit??line.pricePerKg),false,2);
     if(line.tareWeight!==undefined&&line.tareWeight!==null&&new Decimal(decimal(String(line.tareWeight),false)).gt(gross))fail('VALIDATION_FAILED','Bì vượt tổng khối lượng.');
     for(const field of ['qualityPercent','lossPercent'])if((line[field]!==null&&line[field]!==undefined)&&Number(decimal(String(line[field]),false))>100)fail('VALIDATION_FAILED','Sai tỷ lệ.');
     const money=lineMoney({formulaType:line.formulaType as FormulaType,grossWeight:gross,unitPrice:price,tareWeight:(line.tareWeight === null || line.tareWeight === undefined)?undefined:decimal(String(line.tareWeight),false),qualityPercent:(line.qualityPercent === null || line.qualityPercent === undefined)?undefined:String(line.qualityPercent),lossPercent:(line.lossPercent === null || line.lossPercent === undefined)?undefined:String(line.lossPercent)});
     if(!Number.isSafeInteger(money.total.toNumber()))fail('VALIDATION_FAILED','Số tiền vượt khả năng hiển thị của ứng dụng.');
     return {...line,rawTotal:money.rawTotal.toNumber(),roundedTotal:money.total.toNumber()};
    });
    receiptTotal(clean.lines,clean.adjustments);
   }
   if(cmd.kind==='softDelete') {
    await sql`update ${sql(cmd.table)} set deleted_at=now() where id=${cmd.recordId} and user_id=${ctx.actorId}`;
    if(cmd.table==='transactions')await sql`update payments set deleted_at=now() where transaction_id=${cmd.recordId} and user_id=${ctx.actorId} and deleted_at is null`;
   }else{
    for(const k of Object.keys(clean))if(JSON_FIELDS.has(k)&&(clean[k]!==null&&clean[k]!==undefined))clean[k]=sql.json(clean[k]);
    if(cmd.kind==='insert'){clean.id=cmd.recordId;clean.user_id=ctx.actorId;await sql`insert into ${sql(cmd.table)} ${sql(clean,Object.keys(clean))}`;}
    else if(Object.keys(clean).length)await sql`update ${sql(cmd.table)} set ${sql(clean,Object.keys(clean))} where id=${cmd.recordId} and user_id=${ctx.actorId}`;
   }
   await this.db.emit(sql,ctx,'legacy.'+cmd.kind,cmd.recordId);
   return {recordId:cmd.recordId,accepted:true};
  });
 }
 changes(ctx:TxCtx,cursor='0',limit=200){
  if(!/^\d{1,18}$/.test(cursor)||!Number.isInteger(limit)||limit<1||limit>500)fail('VALIDATION_FAILED','Cursor không hợp lệ.');
  return this.db.run(ctx,null,async sql=>{
   const rows=await sql`select seq::text,table_name,record_id,payload from legacy_change_feed where user_id=${ctx.actorId} and seq>${cursor}::bigint order by seq limit ${limit+1}`;
   const page=rows.slice(0,limit),changes:Record<string,Row[]>={suppliers:[],buyers:[],products:[],transactions:[],payments:[],drafts:[],pricingRules:[],notes:[]};
   for(const r of page){const data={...r.payload};if(r.table_name==='transactions') data.payments=(await sql`select to_jsonb(p) as data from payments p where p.transaction_id=${r.record_id} and p.user_id=${ctx.actorId}`).map(p=>p.data);changes[r.table_name==='pricing_rules'?'pricingRules':r.table_name].push(data);}
   return {changes,nextCursor:page.at(-1)?.seq??cursor,hasMore:rows.length>limit};
  });
 }
}

function receiptTotal(lines: Row[], adjustments?: Row[]): Decimal {
 if(adjustments!==undefined&&adjustments!==null&&(!Array.isArray(adjustments)||adjustments.length>100))fail('VALIDATION_FAILED','Điều chỉnh không hợp lệ.');
 let adjustment=new Decimal(0);
 for(const item of adjustments??[]) {
  if(!item||!Number.isSafeInteger(item.amount)||Math.abs(item.amount)>=1e15)fail('VALIDATION_FAILED','Số tiền điều chỉnh không hợp lệ.');
  adjustment=adjustment.plus(item.amount);
 }
 // Match frontend Math.round for signed adjustments, including negative half-thousands.
 const rounded=adjustment.div(1000).toDecimalPlaces(0,Decimal.ROUND_HALF_CEIL).mul(1000);
 const total=lines.reduce((n,line)=>n.plus(line.roundedTotal??0),new Decimal(0)).plus(rounded);
 if(total.lt(0)||!Number.isSafeInteger(total.toNumber()))fail('VALIDATION_FAILED','Tổng phiếu không hợp lệ.');
 return total;
}
