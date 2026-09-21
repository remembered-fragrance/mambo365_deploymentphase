import { requireWorkspace } from './database';
import { Injectable } from '@nestjs/common';
import { fail, AppError } from '../domain/errors';
import type { TxCtx } from './types';
import type { SyncCommand } from '../sync/sync.service';
import { Database, camel, uuid } from './database';
import { entitled } from './pg-market';

@Injectable()
export class PgSyncService {
 constructor(private readonly db:Database){}
 async commands(ctx:TxCtx,input:{deviceId:string;workspaceId:string;commands:readonly SyncCommand[]},handlers:Record<string,(c:SyncCommand,ctx:TxCtx)=>Promise<unknown>>) {
  if(input.workspaceId!==ctx.workspaceId||!Array.isArray(input.commands)||input.commands.length>100)fail('VALIDATION_FAILED','Workspace hoặc batch không hợp lệ.');
  const c={...ctx,workspaceId:uuid(input.workspaceId)};
  await this.db.run(c,'workspaces.read',async sql=>{
    const [device]=await sql`select id from devices where device_id=${input.deviceId} and user_id=${ctx.actorId} and revoked_at is null`;
    if(!device)fail('PERMISSION_DENIED','Thiết bị chưa đăng ký hoặc đã bị thu hồi.');
    await entitled(sql,c.workspaceId,'sync.write');
  });
  const results:Array<Record<string,unknown>>=[],failed=new Set<string>(),seen=new Set<string>();
  for(const cmd of input.commands) {
   if(seen.has(cmd.operationId))fail('VALIDATION_FAILED','operationId bị lặp trong batch.');seen.add(cmd.operationId);
   try {
    uuid(cmd.operationId);uuid(cmd.aggregateId);
    if(!handlers[cmd.type])fail('VALIDATION_FAILED','Loại lệnh không hỗ trợ.');
    if(!Array.isArray(cmd.dependsOn)||cmd.dependsOn.some(d=>failed.has(d))) {failed.add(cmd.operationId);results.push({operationId:cmd.operationId,status:'blocked'});continue;}
    const server=await this.db.command(c,'sync:'+cmd.operationId,cmd.type,cmd,async sql=>{
      for(const dep of cmd.dependsOn) {uuid(dep);const [previous]=await sql`select operation_key from api_commands where actor_id=${ctx.actorId} and workspace_key=${c.workspaceId} and operation_key=${'sync:'+dep}`;if(!previous)fail('VERSION_CONFLICT','Lệnh phụ thuộc chưa hoàn tất.');}
      return handlers[cmd.type](cmd,c);
    });
    results.push({operationId:cmd.operationId,status:'accepted',server});
   }catch(error){if(!(error instanceof AppError))throw error;failed.add(cmd.operationId);results.push({operationId:cmd.operationId,status:error.code==='VERSION_CONFLICT'?'conflict':'rejected',code:error.code});}
  }
  return {results};
 }
 changes(ctx:TxCtx,cursor?:string,limit=100){
  if(cursor&&!/^\d{1,18}$/.test(cursor))fail('SYNC_CURSOR_EXPIRED','Cursor không hợp lệ.');
  if(!Number.isInteger(limit)||limit<1||limit>200)fail('VALIDATION_FAILED','Số bản ghi không hợp lệ.');
  return this.db.run(ctx,'workspaces.read',async sql=>{
   const items=await sql`select workspace_seq::text as id,aggregate_type,aggregate_id,op,payload from change_feed where workspace_id=${requireWorkspace(ctx)} and workspace_seq>${cursor??'0'}::bigint order by workspace_seq limit ${limit+1}`;
   const page=items.slice(0,limit);return {items:camel(page),nextCursor:page.at(-1)?.id??cursor??'0',hasMore:items.length>limit};
  });
 }
 bootstrap(ctx:TxCtx){return this.db.run(ctx,'workspaces.read',async sql=>{
   // Return cursor zero and replay the durable feed in pages: never skip existing entities.
   return {cursor:'0',workspaces:camel(await sql`select id,kind,name,status,version from workspaces where id=${requireWorkspace(ctx)}`),requiresReplay:true};
 });}
}
