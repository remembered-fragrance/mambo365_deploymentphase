import { requireWorkspace } from './database';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'node:crypto';
import { fail } from '../domain/errors';
import type { TxCtx } from './types';
import { Database, camel, one, personalCtx, uuid } from './database';

@Injectable()
export class PgAccountService {
 constructor(private readonly db:Database){}
 requestDeletion(ctx:TxCtx){return this.db.run(ctx,null,async sql=>{
  const owned=await sql`select id from workspaces where owner_user_id=${ctx.actorId} and status='active' for update`;
  if(owned.length)fail('VALIDATION_FAILED','Chuyển quyền hoặc đóng workspace trước khi yêu cầu xóa.');
  const [old]=await sql`select * from deletion_requests where user_id=${ctx.actorId} and status in('pending','processing')`;
  if(old)return camel(old);
  const r=one(await sql`insert into deletion_requests(id,user_id,deadline_at,created_by) values(${randomUUID()},${ctx.actorId},now()+interval '30 days',${ctx.actorId}) returning *`);
  await this.db.emit(sql,ctx,'account.deletion_requested',r.id,{userId:ctx.actorId});return camel(r);
 });}
 getDeletion(ctx:TxCtx,id:string){return this.db.run(ctx,null,async sql=>camel(one(await sql`select * from deletion_requests where id=${uuid(id)} and user_id=${ctx.actorId}`)));}
 exportMine(ctx:TxCtx){return this.db.run(ctx,null,async sql=>({profile:camel(one(await sql`select * from profiles where id=${ctx.actorId}`)),memberships:camel(await sql`select * from memberships where user_id=${ctx.actorId}`)}));}
 closeWorkspace(ctx:TxCtx,id:string){return this.db.run({...ctx,workspaceId:uuid(id)},'workspaces.transfer_owner',async sql=>{
  const w=one(await sql`select * from workspaces where id=${id} for update`);if(w.owner_user_id!==ctx.actorId)fail('PERMISSION_DENIED','Chỉ owner được đóng workspace.');
  const [open]=await sql`select count(*)::int as n from trade_orders o join order_participants p on p.order_id=o.id where p.workspace_id=${id} and o.status not in('completed','cancelled')`;
  const [debt]=await sql`select count(*)::int as n from receivable_payable_entries where workspace_id=${id} and status='open'`;
  if(open.n||debt.n)fail('INVALID_STATE_TRANSITION','Còn đơn hoặc công nợ chưa chốt.');
  await this.db.emit(sql,{...ctx,workspaceId:id},'workspace.closed',id);await sql`update workspaces set status='closed',version=version+1 where id=${id}`;return {id,status:'closed'};
 });}
}

@Injectable()
export class PgFilesService {
 constructor(private readonly db:Database,private readonly config:ConfigService){}
 private async storage(path:string,init:RequestInit={}) {
  const base=this.config.get<string>('SUPABASE_URL'),key=this.config.get<string>('SUPABASE_STORAGE_KEY');
  if(!base||!key)throw new ServiceUnavailableException('Storage chưa cấu hình.');
  const response=await fetch(`${base.replace(/\/$/,'')}/storage/v1/${path}`,{...init,headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new ServiceUnavailableException('Storage tạm thời không khả dụng.');
  return response;
 }
 private objectPath(bucket:string,key:string){return `${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;}
 async createSession(ctx:TxCtx,input:{mime:string;byteSize:number}) {
  if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(input.mime)||!Number.isInteger(input.byteSize)||input.byteSize<1||input.byteSize>5*1024*1024)fail('VALIDATION_FAILED','Tệp không hợp lệ, tối đa 5MB.');
  const bucket=this.config.get<string>('SUPABASE_STORAGE_BUCKET')??'trade-private';
  const file=await this.db.run(ctx,'workspaces.read',async sql=>camel(one(await sql`insert into files(id,status,bucket,storage_key,mime,byte_size,uploader_id,workspace_id) values(${randomUUID()},'pending',${bucket},${ctx.workspaceId+'/'+randomUUID()},${input.mime},${input.byteSize},${ctx.actorId},${requireWorkspace(ctx)}) returning *`)));
  const signed=await (await this.storage('object/upload/sign/'+this.objectPath(bucket,file.storageKey),{method:'POST',body:'{}'})).json() as {url?:string};
  if(!signed.url)throw new ServiceUnavailableException('Không tạo được phiên upload.');
  return {fileId:file.id,uploadUrl:this.config.get<string>('SUPABASE_URL')+'/storage/v1'+signed.url,expiresInSec:7200};
 }
 async finalize(ctx:TxCtx,id:string) {
  const f=await this.db.run(ctx,'workspaces.read',async sql=>one(await sql`select * from files where id=${uuid(id)} and workspace_id=${requireWorkspace(ctx)} and uploader_id=${ctx.actorId}`));
  const response=await this.storage('object/authenticated/'+this.objectPath(f.bucket,f.storage_key));
  if(Number(response.headers.get('content-length')??0)>5*1024*1024)fail('VALIDATION_FAILED','Tệp vượt dung lượng.');
  const reader=response.body?.getReader();if(!reader)throw new ServiceUnavailableException('Không đọc được tệp.');
  const chunks:Uint8Array[]=[];let length=0;
  for(;;){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>5*1024*1024){await reader.cancel();fail('VALIDATION_FAILED','Tệp vượt dung lượng.');}chunks.push(chunk.value);}
  const bytes=Buffer.concat(chunks),mime=response.headers.get('content-type')?.split(';')[0];
  const signature=f.mime==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':f.mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):f.mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(length!==f.byte_size||mime!==f.mime||!signature)fail('VALIDATION_FAILED','Nội dung tệp không khớp phiên upload.');
  const hash=createHash('sha256').update(bytes).digest('hex');
  return this.db.run(ctx,'workspaces.read',async sql=>camel(one(await sql`update files set status='ready',sha256=${hash} where id=${id} and uploader_id=${ctx.actorId} returning id,status,mime,byte_size,sha256`)));
 }
 async signedUrl(ctx:TxCtx,id:string) {
  const f=await this.db.run(ctx,'workspaces.read',async sql=>one(await sql`select * from files where id=${uuid(id)} and workspace_id=${requireWorkspace(ctx)} and status='ready'`));
  const signed=await (await this.storage('object/sign/'+this.objectPath(f.bucket,f.storage_key),{method:'POST',body:JSON.stringify({expiresIn:60})})).json() as {signedURL?:string};
  if(!signed.signedURL)throw new ServiceUnavailableException('Không tạo được URL.');
  return {url:this.config.get<string>('SUPABASE_URL')+'/storage/v1'+signed.signedURL,expiresInSec:60};
 }
}
@Injectable()
export class PgNotificationsService {
 constructor(private readonly db:Database){}
 list(userId:string){return this.db.run(personalCtx(userId),null,async sql=>camel(await sql`select * from notification_inbox where user_id=${userId} order by created_at desc limit 100`));}
 read(userId:string,id:string){return this.db.run(personalCtx(userId),null,async sql=>camel(one(await sql`update notification_inbox set read_at=coalesce(read_at,now()) where id=${uuid(id)} and user_id=${userId} returning *`)));}
}
@Injectable()
export class PgBillingService {
 constructor(private readonly db:Database){}
 status(ctx:TxCtx){return this.db.run(ctx,'workspaces.read',async sql=>({workspaceId:ctx.workspaceId,entitlements:(await sql`select code from entitlements where workspace_id=${requireWorkspace(ctx)} and active`).map(x=>x.code)}));}
}
