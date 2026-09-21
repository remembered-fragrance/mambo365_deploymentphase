const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const postgres=require('postgres');
const {setupDatabase}=require('./setup-database.cjs');
const {ConfigService}=require('@nestjs/config');
const {Database}=require('../dist/infra/database');
const {PgIdentityService,PgWorkspacesService}=require('../dist/infra/pg-identity');
const {PgMarketplaceService,PgLocationsService}=require('../dist/infra/pg-market');
const {PgQuotationsService,PgOrdersService,PgReceivingService}=require('../dist/infra/pg-trade');
const {PgSettlementsService}=require('../dist/infra/pg-settlements');
const {PgSyncService}=require('../dist/infra/pg-sync');
const {PgLegacyService}=require('../dist/infra/pg-legacy');
const {runOutboxBatch}=require('../dist/worker/postgres-outbox');
const {SYSTEM_ROLE_IDS,COMMODITY_IDS}=require('../dist/domain/ids');
let fixture,db,identity,market,quotes,orders,receiving,settlements,locations,legacy,sync,farmer,buyer,stranger,accountant,worker;
const context=(actorId,workspaceId=null)=>({actorId,workspaceId,requestId:randomUUID()});
let listing,orderId,fulfillmentId,entryId;
before(async()=>{
 fixture=await setupDatabase();db=new Database(new ConfigService({DATABASE_URL:fixture.appUrl,PERSISTENCE:'postgres'}));await db.onModuleInit();
 identity=new PgIdentityService(db);market=new PgMarketplaceService(db);quotes=new PgQuotationsService(db);orders=new PgOrdersService(db);receiving=new PgReceivingService(db);settlements=new PgSettlementsService(db);locations=new PgLocationsService(db);legacy=new PgLegacyService(db);sync=new PgSyncService(db);
 for(const kind of ['farmer','enterprise','trader']){
  const id=randomUUID();await fixture.admin`insert into auth.users(id,email,email_confirmed_at) values(${id},${id+'@example.test'},now())`;
  const onboarded=await identity.onboarding(context(id),{kind,displayName:kind});const c=context(id,onboarded.workspace.id);
  if(kind==='farmer')farmer=c;else if(kind==='enterprise')buyer=c;else stranger=c;
 }
 const id=randomUUID();await fixture.admin`insert into auth.users(id,email,email_confirmed_at) values(${id},'accountant@example.test',now())`;
 await fixture.admin`insert into profiles(id,name) values(${id},'Accountant')`;
 await fixture.admin`insert into memberships(id,workspace_id,user_id,role_id,status) values(${randomUUID()},${buyer.workspaceId},${id},${SYSTEM_ROLE_IDS.accountant},'active')`;accountant=context(id,buyer.workspaceId);
 worker=postgres(fixture.workerUrl,{max:2,onnotice:()=>{}});
}, {timeout:180000});
after(async()=>{if(worker)await worker.end();if(db)await db.onApplicationShutdown();if(fixture)await fixture.close();});

test('real restricted database role, missing context and outsider isolation',async()=>{
 const [role]=await db.pool`select current_user as name`;assert.equal(role.name,'mambo_app');
 assert.equal((await db.pool`select * from workspaces`).length,0);
 await assert.rejects(()=>db.run({...stranger,workspaceId:buyer.workspaceId},'workspaces.read',async()=>true),e=>e.code==='WORKSPACE_ACCESS_REVOKED');
 const items=await db.run(stranger,'workspaces.read',sql=>sql`select * from settlements where workspace_id=${buyer.workspaceId}`);assert.equal(items.length,0);
});
test('quote acceptance rejects self-accept, commits one order, persists replay and stock reservation',async()=>{
 const farm=await market.createFarm(farmer,{name:'Vườn thử'});const lot=await market.createLot(farmer,farm.id,{commodityId:COMMODITY_IDS.coffee,harvestedQty:'100'});
 listing=await market.createListing(farmer,{commodityId:COMMODITY_IDS.coffee,harvestLotId:lot.id,qty:'100'});await market.listingAction(farmer,listing.id,'published');
 const q=await quotes.create(farmer,{listingId:listing.id,toWorkspaceId:buyer.workspaceId,lines:[{commodityId:COMMODITY_IDS.coffee,qty:'80',unitPrice:'50000'}]});await quotes.send(farmer,q.quotation.id);
 const input={revisionId:q.revision.id,expectedVersion:1,operationId:randomUUID()};
 await assert.rejects(()=>quotes.accept(farmer,q.quotation.id,input),e=>e.code==='PERMISSION_DENIED');
 const results=await Promise.all([quotes.accept(buyer,q.quotation.id,input),quotes.accept(buyer,q.quotation.id,input)]);assert.equal(results[0].orderId,results[1].orderId);orderId=results[0].orderId;
 const rows=await fixture.admin`select reserved_qty from harvest_lots where id=${lot.id}`;assert.equal(Number(rows[0].reserved_qty),80);
 const second=new Database(new ConfigService({DATABASE_URL:fixture.appUrl}));try{const replay=await new PgQuotationsService(second).accept(buyer,q.quotation.id,input);assert.equal(replay.orderId,orderId);}finally{await second.onApplicationShutdown();}
 await assert.rejects(()=>quotes.accept(buyer,q.quotation.id,{...input,expectedVersion:2}),e=>e.code==='IDEMPOTENCY_KEY_REUSED');
 assert.equal((await orders.list(stranger)).length,0);
});
test('receiving rollback, stock/debt posting, duplicate request and partial delivery',async()=>{
 const f=await receiving.createFulfillment(buyer,orderId,{expectedQty:'40'});fulfillmentId=f.id;
 await receiving.weigh(buyer,f.id,{grossWeight:'42',tareWeight:'2'});
 await assert.rejects(()=>receiving.accept(buyer,f.id,{qtyAccepted:'41',operationId:randomUUID()}),e=>e.code==='VALIDATION_FAILED');
 assert.equal((await fixture.admin`select * from acceptance_records where fulfillment_id=${f.id}`).length,0);
 const operationId=randomUUID(),r=await receiving.accept(buyer,f.id,{qtyAccepted:'40',operationId});assert.equal(r.amount,'2000000');
 assert.deepEqual(await receiving.accept(buyer,f.id,{qtyAccepted:'40',operationId}),r);
 const entries=await fixture.admin`select * from receivable_payable_entries where fulfillment_id=${f.id}`;assert.equal(entries.length,2);entryId=entries.find(e=>e.workspace_id===buyer.workspaceId).id;
 assert.equal((await orders.get(buyer,orderId)).status,'in_fulfillment');
 await assert.rejects(()=>orders.cancel(buyer,orderId,2),e=>e.code==='INVALID_STATE_TRANSITION');
});
test('payment maker-checker, over-allocation protection, immutable allocations and reversal',async()=>{
 const s=await settlements.declare(buyer,{direction:'out',amount:'2000000',valueDate:'2026-09-21',operationId:randomUUID()});
 await assert.rejects(()=>settlements.confirm(buyer,s.id),e=>e.code==='PERMISSION_DENIED');
 await settlements.confirm(accountant,s.id);
 const requests=await Promise.allSettled([settlements.allocate(accountant,s.id,{entryId,amount:'1500000',operationId:randomUUID()}),settlements.allocate(accountant,s.id,{entryId,amount:'1500000',operationId:randomUUID()})]);
 assert.equal(requests.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await settlements.debts(buyer)).find(e=>e.id===entryId).remaining,'500000');
 await settlements.reverse(accountant,s.id,'Sai chứng từ, đảo bút toán');
 assert.equal((await settlements.debts(buyer)).find(e=>e.id===entryId).remaining,'2000000');
 assert.equal((await fixture.admin`select * from settlement_allocations where settlement_id=${s.id}`).length,1);
});
test('revoked membership cannot replay a previously accepted command',async()=>{
 await fixture.admin`update memberships set revoked_at=now(),status='revoked' where user_id=${accountant.actorId}`;
 await assert.rejects(()=>settlements.debts(accountant),e=>e.code==='WORKSPACE_ACCESS_REVOKED');
});
test('PostGIS public projections, unpublished exclusion, spatial cursor without duplicates',async()=>{
 const loc=await locations.create(farmer,{name:'Điểm thu mua',addressText:'Đắk Lắk',lat:12.68,lng:108.05});
 assert.equal((await locations.nearby({lat:12.68,lng:108.05})).items.length,0);
 await locations.submitReview(farmer,loc.id);
 await fixture.admin`insert into platform_admins(user_id) values(${stranger.actorId})`;
 await locations.moderatePublish(stranger,loc.id,'published');
 const nearby=await locations.nearby({lat:12.68,lng:108.05,limit:1});assert.equal(nearby.items[0].id,loc.id);assert.equal(nearby.items[0].distanceM,0);
 assert.equal(nearby.items[0].workspaceId,undefined);
});
test('legacy API durable replay, owner isolation, tombstones, client cutover',async()=>{
 const c=context(farmer.actorId),id=randomUUID(),op={operationId:randomUUID(),recordId:id,table:'notes',kind:'insert',payload:{user_id:farmer.actorId,body:'Ghi chú bền vững',pinned:false,done:false}};
 await legacy.claim(c);await legacy.command(c,op);await legacy.command(c,op);
 const first=await legacy.changes(c);assert.equal(first.changes.notes.filter(n=>n.id===id).length,1);
 await assert.rejects(async()=>legacy.command(context(stranger.actorId),{...op,operationId:randomUUID()}),e=>e.code==='PERMISSION_DENIED');
 await legacy.command(c,{operationId:randomUUID(),recordId:id,table:'notes',kind:'softDelete',payload:{}});
 const second=await legacy.changes(c,first.nextCursor);assert.ok(second.changes.notes[0].deleted_at);
 await assert.rejects(()=>fixture.admin.begin(async sql=>{await sql`set local role authenticated`;await sql`select set_config('request.jwt.claim.sub',${farmer.actorId},true)`;await sql`insert into notes(id,user_id,body) values(${randomUUID()},${farmer.actorId},'Bypass')`;}),e=>e.code==='42501');
});

test('legacy receipt ignores forged totals and serializes concurrent payments',async()=>{
 const c=context(buyer.actorId),recordId=randomUUID();
 await legacy.command(c,{operationId:randomUUID(),recordId,table:'transactions',kind:'insert',payload:{date:new Date().toISOString(),kind:'purchase',supplier_name:'Khách lẻ',lines:[{formulaType:'standard',grossWeight:10,pricePerUnit:1000,rawTotal:999999,roundedTotal:999999}]}});
 const [receipt]=await fixture.admin`select lines from transactions where id=${recordId}`;assert.equal(receipt.lines[0].roundedTotal,10000);
 const pay=()=>legacy.command(c,{operationId:randomUUID(),recordId:randomUUID(),table:'payments',kind:'insert',payload:{transaction_id:recordId,date:new Date().toISOString(),amount:7000}});
 const results=await Promise.allSettled([pay(),pay()]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const [paid]=await fixture.admin`select sum(amount)::text as n from payments where transaction_id=${recordId}`;assert.equal(Number(paid.n),7000);
});
test('durable outbox survives new worker connections and concurrent drain; no duplicate inbox',async()=>{
 await Promise.all([runOutboxBatch(worker,randomUUID()),runOutboxBatch(worker,randomUUID())]);
 const [counts]=await fixture.admin`select count(*)::int as n from notification_inbox`;assert.ok(counts.n>0);
 await runOutboxBatch(worker,randomUUID());const [again]=await fixture.admin`select count(*)::int as n from notification_inbox`;assert.equal(again.n,counts.n);
 const [pending]=await fixture.admin`select count(*)::int as n from outbox_events where status<>'done'`;assert.equal(pending.n,0);
});

test('close remainder releases unused reservations without erasing stock or debt',async()=>{
 const o=await orders.get(buyer,orderId);
 await assert.rejects(()=>orders.closeRemainder(stranger,orderId,o.version,'No more deliveries'),e=>e.code==='PERMISSION_DENIED');
 const result=await orders.closeRemainder(buyer,orderId,o.version,'Chốt phần đã giao');assert.equal(result.status,'completed');
 const [lot]=await fixture.admin`select reserved_qty,delivered_qty from harvest_lots where id=${listing.harvestLotId}`;
 assert.equal(Number(lot.reserved_qty),0);assert.equal(Number(lot.delivered_qty),40);
 assert.equal((await fixture.admin`select * from receivable_payable_entries where fulfillment_id=${fulfillmentId}`).length,2);
 await assert.rejects(()=>receiving.createFulfillment(buyer,orderId,{expectedQty:'40'}),e=>e.code==='INVALID_STATE_TRANSITION');
});

test('shared request budget cannot be bypassed by opening another connection',async()=>{
 await fixture.admin`insert into api_rate_limits(actor_id,window_start,hits) values(${stranger.actorId},date_trunc('minute',clock_timestamp()),300)`;
 const allowed=await db.run(context(stranger.actorId),null,async sql=>(await sql`select consume_api_budget() as allowed`)[0].allowed);
 assert.equal(allowed,false);
 await fixture.admin`update api_rate_limits set window_start=now()-interval '2 minutes' where actor_id=${stranger.actorId}`;
 assert.equal(await db.run(context(stranger.actorId),null,async sql=>(await sql`select consume_api_budget() as allowed`)[0].allowed),true);
});

test('offline sync persists dependencies and rejects revoked devices',async()=>{
 const device=await identity.registerDevice(buyer.actorId,'integration-device','web');
 const operationId=randomUUID(),command={operationId,type:'farm.create',aggregateId:randomUUID(),expectedVersion:0,clientCreatedAt:new Date().toISOString(),dependsOn:[],payload:{name:'Offline farm'}};
 const input={deviceId:'integration-device',workspaceId:buyer.workspaceId,commands:[command]};
 const handlers={'farm.create':(cmd,c)=>market.createFarm(c,cmd.payload)};
 const first=await sync.commands(buyer,input,handlers);assert.equal(first.results[0].status,'accepted');
 const replay=await sync.commands(buyer,input,handlers);assert.deepEqual(replay,first);
 const blocked=await sync.commands(buyer,{...input,commands:[{...command,operationId:randomUUID(),dependsOn:[randomUUID()]}]},handlers);assert.equal(blocked.results[0].status,'conflict');
 const feed=await sync.changes(buyer);assert.ok(feed.items.length>0);
 await identity.revokeDevice(buyer.actorId,device.id);
 await assert.rejects(()=>sync.commands(buyer,input,handlers),e=>e.code==='PERMISSION_DENIED');
});

test('real HTTP: authentication, validation, workspace selection, idempotency and session revocation',async()=>{
 const secret=randomUUID()+randomUUID();
 Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:fixture.appUrl,PERSISTENCE:'postgres',DB_SSL:'',SUPABASE_JWT_ISSUER:'https://auth.example.test/auth/v1',SUPABASE_JWT_SECRET:secret});
 const {NestFactory}=require('@nestjs/core');
 const {AppModule}=require('../dist/app.module');
 const {configureHttp}=require('../dist/bootstrap');
 const {SignJWT}=require('jose');
 const token=await new SignJWT({role:'authenticated'}).setProtectedHeader({alg:'HS256'}).setSubject(farmer.actorId).setIssuer(process.env.SUPABASE_JWT_ISSUER).setAudience('authenticated').setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(secret));
 const app=await NestFactory.create(AppModule,{logger:false});configureHttp(app);await app.listen(0,'127.0.0.1');
 const base=await app.getUrl();
 const request=(path,body,key,workspace)=>fetch(base+'/api/v1'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...(key?{'idempotency-key':key}:{}),...(workspace?{'x-workspace-id':workspace}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 try{
  assert.equal((await fetch(base+'/api/v1/me')).status,401);
  assert.equal((await fetch(base+'/api/v1/health/ready')).status,200);
  assert.equal((await request('/me')).status,200);
  assert.equal((await request('/me/workspaces/'+farmer.workspaceId+'/select',{},randomUUID())).status,201);
  assert.equal((await request('/me/workspaces/'+buyer.workspaceId+'/select',{},randomUUID())).status,403);
  assert.equal((await request('/farms',{name:'HTTP farm'},undefined,farmer.workspaceId)).status,400);
  assert.equal((await request('/farms',{name:123},randomUUID(),farmer.workspaceId)).status,400);
  const key=randomUUID(),first=await request('/farms',{name:'HTTP farm'},key,farmer.workspaceId);assert.equal(first.status,201);const result=await first.json();
  const replay=await request('/farms',{name:'HTTP farm'},key,farmer.workspaceId);assert.equal(replay.status,201);assert.deepEqual(await replay.json(),result);
  assert.equal((await request('/farms',{name:'Changed'},key,farmer.workspaceId)).status,409);
  assert.equal((await request('/settlements',{direction:'out',amount:'1000',valueDate:'2026-09-21'},randomUUID(),farmer.workspaceId)).status,201);
  assert.equal((await request('/quotations/'+randomUUID()+'/counter',{expectedVersion:1,lines:[]},randomUUID(),farmer.workspaceId)).status,400);
  assert.equal((await request('/me/devices',{deviceId:'http-test',platform:'web'},randomUUID())).status,201);
  assert.equal((await (await request('/me/devices')).json()).length,1);
  assert.equal((await request('/me/sessions/revoke-all',{},randomUUID())).status,201);
  assert.equal((await request('/me')).status,401);
 }finally{await app.close();}
});

test('invitations require verified matching identity and grant only the invited role',async()=>{
 const service=new PgWorkspacesService(db);
 const invitation=await service.invite(farmer,farmer.workspaceId,{emailOrPhone:stranger.actorId+'@example.test',roleId:SYSTEM_ROLE_IDS.viewer});
 await assert.rejects(()=>service.accept(context(buyer.actorId),invitation.token),e=>e.code==='PERMISSION_DENIED');
 await service.accept(context(stranger.actorId),invitation.token);
 const c=context(stranger.actorId,farmer.workspaceId);
 assert.ok((await service.get(c,farmer.workspaceId)).members.some(m=>m.userId===stranger.actorId));
 await assert.rejects(()=>market.createFarm(c,{name:'Forbidden'}),e=>e.code==='PERMISSION_DENIED');
});
