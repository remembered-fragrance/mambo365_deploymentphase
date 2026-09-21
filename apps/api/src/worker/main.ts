import { config } from 'dotenv';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { runOutboxBatch } from './postgres-outbox';

async function main() {
 config();
 if(!process.env.WORKER_DATABASE_URL)throw new Error('WORKER_DATABASE_URL is required');
 const sql=postgres(process.env.WORKER_DATABASE_URL,{max:2,prepare:false,ssl:process.env.DB_SSL==='require'?'verify-full':undefined});
 const [role]=await sql`select current_user as name,rolsuper,rolbypassrls from pg_roles where rolname=current_user`;
 if(role.name!=='mambo_worker'||role.rolsuper||role.rolbypassrls)throw new Error('Worker requires restricted mambo_worker login');
 const workerId=randomUUID();let stopping=false;
 process.once('SIGINT',()=>{stopping=true;});process.once('SIGTERM',()=>{stopping=true;});
 // Updated by SIGINT/SIGTERM handlers while the loop awaits I/O.
 // eslint-disable-next-line no-unmodified-loop-condition
 while(!stopping){try{await runOutboxBatch(sql,workerId);}catch(error){console.error(JSON.stringify({event:'outbox.error',code:(error as {code?:string}).code??'UNKNOWN'}));}if(!stopping)await new Promise(r=>setTimeout(r,2000));}
 await sql.end({timeout:5});
}
main().catch(()=>{console.error('Worker startup failed; verify configuration and database role.');process.exitCode=1;});
