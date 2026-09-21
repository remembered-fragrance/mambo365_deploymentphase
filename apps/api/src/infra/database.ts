import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { AppError, fail, must } from '../domain/errors';
import { hasPermission, type Permission } from '../domain/permissions';
import type { TxCtx } from './types';

export type Sql = postgres.TransactionSql;
export type Row = postgres.Row;
export const requireWorkspace = (ctx: TxCtx): string => ctx.workspaceId ?? fail('PERMISSION_DENIED','Thiếu workspace.');
export const personalCtx = (actorId: string): TxCtx => ({ actorId, workspaceId: null, requestId: randomUUID() });
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuid(value: string): string {
  if (!UUID.test(value)) fail('VALIDATION_FAILED', 'UUID không hợp lệ.');
  return value;
}
export function camel<T = Row>(value: unknown): T {
  if (Array.isArray(value)) return value.map(v => camel(v)) as T;
  if (value instanceof Date) return value.toISOString() as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), camel(v)])) as T;
  return value as T;
}
export const one = (rows: Row[]): Row => must(rows[0]);
const canonical = (x: unknown): string => {
  if (Array.isArray(x)) return `[${x.map(canonical).join(',')}]`;
  if (x && typeof x === 'object') return `{${Object.entries(x).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(x) ?? 'null';
};

@Injectable()
export class Database implements OnModuleInit, OnApplicationShutdown {
  readonly pool: postgres.Sql;
  private readonly current = new AsyncLocalStorage<{ sql: Sql; ctx: TxCtx }>();
  constructor(private readonly config: ConfigService) {
    if (config.get('PERSISTENCE') && config.get('PERSISTENCE') !== 'postgres') throw new Error('API runtime requires PERSISTENCE=postgres. MemoryPlatform is a unit-test fixture only.');
    const url = config.get<string>('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL is required');
    this.pool = postgres(url, { max: Number(config.get('DB_POOL_SIZE') ?? 10), connect_timeout: 5, idle_timeout: 20, prepare: false,
      ssl: config.get('DB_SSL') === 'require' ? 'verify-full' : undefined });
  }
  async onModuleInit() { await this.ready(); }
  async onApplicationShutdown() { await this.pool.end({ timeout: 5 }); }
  async ready() {
    const [r] = await this.pool`select current_user as name, rolsuper, rolbypassrls from pg_roles where rolname=current_user`;
    if (!r || r.rolsuper || r.rolbypassrls || r.name !== 'mambo_app') throw new Error('DATABASE_URL must connect as restricted mambo_app role');
    const [v] = await this.pool`select postgis_version() as postgis, to_regclass('public.api_commands') as commands, to_regprocedure('public.consume_api_budget()') as budget`;
    if (!v.commands || !v.budget) throw new Error('Missing backend hardening migration');
    return { status: 'ok', persistence: 'postgres', postgis: v.postgis };
  }
  async run<T>(ctx: TxCtx, permission: Permission | null, fn: (sql: Sql) => Promise<T>): Promise<T> {
    uuid(ctx.actorId);
    if (ctx.workspaceId) uuid(ctx.workspaceId);
    const nested = this.current.getStore();
    if (nested) {
      if (nested.ctx.actorId !== ctx.actorId || (ctx.workspaceId !== null && nested.ctx.workspaceId !== ctx.workspaceId)) throw new Error('Cannot change identity inside a transaction');
      if (permission) await this.member(nested.sql, ctx, permission);
      return fn(nested.sql);
    }
    for (let attempt=0;;attempt++) {
      try {
        return await this.pool.begin('isolation level serializable', async tx => {
          const sql = tx as unknown as Sql;
          await sql`select set_config('app.actor_id', ${ctx.actorId}, true), set_config('app.workspace_id', ${ctx.workspaceId ?? ''}, true), set_config('app.is_platform', 'false', true), set_config('statement_timeout','15000',true), set_config('lock_timeout','5000',true)`;
          const [profile] = await sql`select status from profiles where id=${ctx.actorId}`;
          if (profile && profile.status !== 'active') fail('UNAUTHENTICATED','Tài khoản không hoạt động.');
          if (permission) await this.member(sql,ctx,permission);
          return this.current.run({ sql,ctx },()=>fn(sql));
        }) as T;
      } catch (error) {
        const e = error as { code?: string; message?: string };
        if (['40001','40P01'].includes(e.code ?? '') && attempt < 3) continue;
        if (e.code==='42501') fail('PERMISSION_DENIED','Không có quyền truy cập dữ liệu.');
        if (['23503','23514','22P02','22007','22008','22003'].includes(e.code ?? '')) fail('VALIDATION_FAILED','Dữ liệu không hợp lệ hoặc tham chiếu không tồn tại.');
        if (e.code==='23505') fail('VERSION_CONFLICT','Bản ghi đã tồn tại hoặc thao tác đã được xử lý.');
        if (e.code==='P0001') {
          const code = e.message?.split(':')[0];
          if (['PERMISSION_DENIED','INSUFFICIENT_STOCK','VERSION_CONFLICT','INVALID_STATE_TRANSITION','QUOTE_EXPIRED','VALIDATION_FAILED'].includes(code ?? '')) throw new AppError(code as AppError['code'], e.message ?? 'Thao tác bị từ chối.');
        }
        throw error;
      }
    }
  }
  async publicRead<T>(fn: (sql: Sql)=>Promise<T>): Promise<T> {
    return await this.pool.begin('read only', tx => fn(tx as unknown as Sql)) as T;
  }
  async member(sql: Sql, ctx: TxCtx, permission?: Permission) {
    if (!ctx.workspaceId) fail('PERMISSION_DENIED','Thiếu workspace.');
    const [m] = await sql`select m.* from memberships m join workspaces w on w.id=m.workspace_id where m.user_id=${ctx.actorId} and m.workspace_id=${requireWorkspace(ctx)} and m.status='active' and m.revoked_at is null and w.status='active'`;
    if (!m) fail('WORKSPACE_ACCESS_REVOKED','Không còn quyền trên không gian này.');
    if (permission && !hasPermission(m.role_id, permission)) fail('PERMISSION_DENIED','Không đủ quyền.');
    return m;
  }
  async command<T>(ctx: TxCtx, key: string, type: string, payload: unknown, fn: (sql: Sql)=>Promise<T>): Promise<T> {
    if (!key || key.length>200) fail('VALIDATION_FAILED','Cần Idempotency-Key hoặc operationId ổn định.');
    const scope = `${ctx.actorId}:${ctx.workspaceId ?? ''}:${key}`;
    const hash = createHash('sha256').update(canonical({type,payload})).digest('hex');
    return this.run(ctx,null,async sql=>{
      if (ctx.workspaceId) await this.member(sql,ctx);
      await sql`select pg_advisory_xact_lock(hashtextextended(${scope},0))`;
      const [previous] = await sql`select * from api_commands where actor_id=${ctx.actorId} and workspace_key=${ctx.workspaceId ?? ''} and operation_key=${key}`;
      if (previous) {
        if (previous.request_hash!==hash || previous.command_type!==type) fail('IDEMPOTENCY_KEY_REUSED','Mã thao tác đã dùng với nội dung khác.');
        return previous.response as T;
      }
      const result = await fn(sql);
      await sql`insert into api_commands(actor_id,workspace_key,operation_key,command_type,request_hash,response) values(${ctx.actorId},${ctx.workspaceId ?? ''},${key},${type},${hash},${sql.json(result as never)})`;
      return result;
    });
  }
  async emit(sql: Sql, ctx: TxCtx, topic: string, id: string, payload: Row = {}) {
    await sql`insert into outbox_events(topic,payload) values(${topic},${sql.json({ ...payload, actorId: ctx.actorId, workspaceId:ctx.workspaceId, resourceId:id } as never)})`;
    await sql`insert into audit_events(actor_id,action,resource,resource_id,request_id) values(${ctx.actorId},${topic},${topic.split('.')[0]},${id},${ctx.requestId})`;
  }
}
