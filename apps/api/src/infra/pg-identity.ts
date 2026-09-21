import { requireWorkspace } from './database';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { fail } from '../domain/errors';
import { randomToken, sha256, SYSTEM_ROLE_IDS } from '../domain/ids';
import { inviteRoleAllowed, roleCodeOf } from '../domain/permissions';
import type { TxCtx, WorkspaceKind } from './types';
import { Database, camel, one, personalCtx, uuid, type Sql } from './database';

async function createWorkspace(sql: Sql, ctx: TxCtx, kind: WorkspaceKind, name: string) {
  if (!name?.trim() || name.length>200) fail('VALIDATION_FAILED','Tên không hợp lệ.');
  const id=randomUUID(), partyId=randomUUID();
  const partyKind=kind==='personal_farm'?'farmer':kind;
  const ws=one(await sql`insert into workspaces(id,code,kind,name,owner_user_id,created_by) values(${id},${kind+'-'+id},${kind},${name.trim()},${ctx.actorId},${ctx.actorId}) returning *`);
  await sql`insert into memberships(id,workspace_id,user_id,role_id,status) values(${randomUUID()},${id},${ctx.actorId},${SYSTEM_ROLE_IDS.owner},'active')`;
  const party=one(await sql`insert into business_parties(id,workspace_id,display_name,kind) values(${partyId},${id},${name.trim()},${partyKind}) returning id,workspace_id,display_name,kind`);
  await sql`insert into entitlements(workspace_id,code) values(${id},'sync.write'),(${id},'listings.publish')`;
  await sql`insert into warehouses(id,workspace_id,name) values(${randomUUID()},${id},'Kho chính')`;
  if(partyKind==='farmer') await sql`insert into farmer_profiles(party_id) values(${partyId})`;
  if(partyKind==='trader') await sql`insert into trader_profiles(party_id,trade_name) values(${partyId},${name.trim()})`;
  if(partyKind==='enterprise') await sql`insert into enterprise_profiles(party_id) values(${partyId})`;
  return { workspace:camel(ws),party:camel(party) };
}

@Injectable()
export class PgIdentityService {
  constructor(private readonly db: Database) {}
  me(userId:string) {return this.db.run(personalCtx(userId),null,async sql=>{
    const [profile]=await sql`select * from profiles where id=${userId}`;
    const workspaces=await sql`select w.id,w.kind,w.name,w.status,m.role_id from workspaces w join memberships m on m.workspace_id=w.id where m.user_id=${userId} and m.status='active' and m.revoked_at is null order by w.created_at`;
    const [pref]=await sql`select last_workspace_id from user_preferences where user_id=${userId}`;
    return {userId,profile:camel(profile??null),workspaces:camel(workspaces),lastWorkspaceId:pref?.last_workspace_id??null,verified:{phone:!!profile?.phone_verified_at,email:!!profile?.email_verified_at}};
  });}
  onboarding(ctx:TxCtx,input:{kind:'farmer'|'trader'|'enterprise';displayName:string;workspaceName?:string}) {
    return this.db.run(ctx,null,async sql=>{
      await sql`select pg_advisory_xact_lock(hashtextextended(${ctx.actorId},0))`;
      const kind=input.kind==='farmer'?'personal_farm':input.kind;
      await sql`insert into profiles(id,name) values(${ctx.actorId},${input.displayName}) on conflict(id) do nothing`;
      const [existing]=await sql`select * from workspaces where owner_user_id=${ctx.actorId} and kind=${kind} and status<>'closed'`;
      const seeded=existing?{workspace:camel(existing),party:camel(one(await sql`select id,workspace_id,display_name,kind from business_parties where workspace_id=${existing.id}`))}:await createWorkspace(sql,ctx,kind,input.workspaceName??input.displayName);
      await sql`insert into user_preferences(user_id,last_workspace_id) values(${ctx.actorId},${seeded.workspace.id}) on conflict(user_id) do update set last_workspace_id=excluded.last_workspace_id`;
      if(!existing) await this.db.emit(sql,ctx,'user.registered',ctx.actorId,{userId:ctx.actorId,workspaceId:seeded.workspace.id});
      return {profile:camel(one(await sql`select * from profiles where id=${ctx.actorId}`)),workspace:seeded.workspace,partyId:seeded.party.id,replayed:!!existing};
    });
  }
  patchMe(userId:string,patch:{name?:string;businessName?:string;locale?:string}) {
    return this.db.run(personalCtx(userId),null,async sql=>camel(one(await sql`update profiles set name=coalesce(${patch.name??null},name),business_name=coalesce(${patch.businessName??null},business_name),locale=coalesce(${patch.locale??null},locale) where id=${userId} returning *`)));
  }
  selectWorkspace(ctx:TxCtx,workspaceId:string) {return this.db.run({...ctx,workspaceId:uuid(workspaceId)},'workspaces.read',async sql=>{
    await sql`insert into user_preferences(user_id,last_workspace_id) values(${ctx.actorId},${workspaceId}) on conflict(user_id) do update set last_workspace_id=excluded.last_workspace_id`;
    return {workspaceId};
  });}
  registerDevice(userId:string,deviceId:string,platform:'web'|'android') {return this.db.run(personalCtx(userId),null,async sql=>camel(one(await sql`insert into devices(id,user_id,device_id,platform) values(${randomUUID()},${userId},${deviceId},${platform}) on conflict(user_id,device_id) do update set revoked_at=null,last_seen_at=now() returning *`)));}
  listDevices(userId:string) {return this.db.run(personalCtx(userId),null,async sql=>camel(await sql`select id,device_id,platform,last_seen_at,revoked_at from devices where user_id=${userId} order by last_seen_at desc limit 100`));}
  revokeDevice(userId:string,id:string) {return this.db.run(personalCtx(userId),null,async sql=>camel(one(await sql`update devices set revoked_at=now() where id=${uuid(id)} and user_id=${userId} returning *`)));}
  revokeAllSessions(userId:string) {return this.db.run(personalCtx(userId),null,async sql=>{
    await sql`update profiles set sessions_valid_after=now() where id=${userId}`;
    await sql`update devices set revoked_at=now() where user_id=${userId}`;
    return {ok:true};
  });}
}

@Injectable()
export class PgWorkspacesService {
 constructor(private readonly db:Database) {}
 create(ctx:TxCtx,input:{kind:WorkspaceKind;name:string}) {return this.db.run(ctx,null,sql=>createWorkspace(sql,ctx,input.kind,input.name));}
 get(ctx:TxCtx,id:string) {return this.db.run({...ctx,workspaceId:uuid(id)},'workspaces.read',async sql=>({...camel(one(await sql`select * from workspaces where id=${id}`)),members:camel(await sql`select id,user_id,role_id,status from memberships where workspace_id=${id}`)}));}
 invite(ctx:TxCtx,workspaceId:string,input:{emailOrPhone:string;roleId:string}) {const c={...ctx,workspaceId:uuid(workspaceId)};return this.db.run(c,'workspaces.invite',async sql=>{
   const m=await this.db.member(sql,c);
   if(!roleCodeOf(input.roleId)||!inviteRoleAllowed(m.role_id,input.roleId)) fail('PERMISSION_DENIED','Không được gán vai trò này.');
   const token=randomToken(),id=randomUUID();
   const row=one(await sql`insert into invitations(id,workspace_id,email_or_phone,role_id,token_hash,expires_at,invited_by) values(${id},${workspaceId},${input.emailOrPhone.trim().toLowerCase()},${input.roleId},${sha256(token)},now()+interval '7 days',${ctx.actorId}) returning expires_at`);
   await this.db.emit(sql,c,'member.invited',id);
   return {invitationId:id,token,expiresAt:row.expires_at};
 });}
 accept(ctx:TxCtx,token:string) {return this.db.run(ctx,null,async sql=>one(await sql`select accept_workspace_invitation(${sha256(token)}) as result`).result);}
 revoke(ctx:TxCtx,id:string) {return this.db.run(ctx,'workspaces.invite',async sql=>{
   const target=one(await sql`select * from memberships where id=${uuid(id)} and workspace_id=${requireWorkspace(ctx)} for update`);
   if(target.role_id===SYSTEM_ROLE_IDS.owner) fail('PERMISSION_DENIED','Phải chuyển quyền owner trước.');
   const result=one(await sql`update memberships set status='revoked',revoked_at=now(),version=version+1 where id=${id} returning *`);
   await this.db.emit(sql,ctx,'membership.revoked',id);return camel(result);
 });}
 transferOwner(ctx:TxCtx,workspaceId:string,toMembershipId:string) {return this.db.run({...ctx,workspaceId},'workspaces.transfer_owner',async sql=>{
   return one(await sql`select transfer_workspace_owner(${uuid(workspaceId)},${uuid(toMembershipId)}) as result`).result;
 });}
}
