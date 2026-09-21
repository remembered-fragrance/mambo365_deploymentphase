import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { from, lastValueFrom, Observable } from 'rxjs';
import { Database } from '../infra/database';
import { fail } from '../domain/errors';
import type { Actor } from '../auth/jwt';

@Injectable()
export class CommandInterceptor implements NestInterceptor {
 constructor(private readonly db:Database){}
 intercept(context:ExecutionContext,next:CallHandler):Observable<unknown>{
  const req=context.switchToHttp().getRequest<{method:string;originalUrl:string;path:string;body?:Record<string,unknown>;headers:Record<string,string|undefined>;actor?:Actor;requestId:string}>();
  if(['GET','HEAD','OPTIONS'].includes(req.method)||!req.actor)return next.handle();
  // Batch commands own their transaction per operation; file I/O must not hold DB locks.
  if(req.path.endsWith('/sync/commands')||req.path.includes('/files/')||req.path.endsWith('/sync/bootstrap'))return next.handle();
  const key=req.headers['idempotency-key']??(typeof req.body?.operationId==='string'?req.body.operationId:undefined);
  if(!key)fail('VALIDATION_FAILED','Cần Idempotency-Key để gửi lại an toàn.');
  const targetWorkspace=req.path.match(/\/(?:me\/)?workspaces\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  const ctx={actorId:req.actor.userId,workspaceId:targetWorkspace??req.headers['x-workspace-id']??null,requestId:req.requestId};
  return from(this.db.command(ctx,'http:'+key,req.method+' '+req.path,req.body??{},()=>lastValueFrom(next.handle())));
 }
}
