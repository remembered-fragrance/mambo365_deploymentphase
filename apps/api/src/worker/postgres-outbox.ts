import type postgres from 'postgres';

/** Inbox creation and event acknowledgment commit together. A crash rolls both back. */
export async function runOutboxBatch(pool:postgres.Sql,workerId:string,limit=50) {
 return pool.begin(async sql=>{
  const events=await sql`select * from outbox_events where (status='pending' and available_at<=now()) or (status='processing' and locked_until<now()) order by id for update skip locked limit ${Math.min(limit,100)}`;
  for(const event of events) {
   try {
    await sql.savepoint(async tx=>{
     await tx`update outbox_events set status='processing',attempts=attempts+1,locked_by=${workerId},locked_until=now()+interval '1 minute' where id=${event.id}`;
     const recipients=await tx`select user_id from outbox_recipients(${event.id}::bigint)`;
     for(const r of recipients) await tx`insert into notification_inbox(id,user_id,type,title,body_safe,dedup_key) values(gen_random_uuid(),${r.user_id},${event.topic},'Cập nhật THUMUA365','Có cập nhật trong giao dịch của bạn.',${'event:'+event.id}) on conflict(user_id,dedup_key) do nothing`;
     await tx`update outbox_events set status='done',completed_at=now(),locked_until=null,locked_by=null,last_error=null where id=${event.id}`;
    });
   }catch(error){const code=(error as {code?:string}).code??'UNKNOWN';await sql`update outbox_events set attempts=attempts+1,status=case when attempts+1>=8 then 'dead' else 'pending' end,available_at=now()+make_interval(secs=>least(300,power(2,attempts+1))::int),locked_until=null,locked_by=null,last_error=${code} where id=${event.id}`;}
  }
  return events.length;
 });
}
