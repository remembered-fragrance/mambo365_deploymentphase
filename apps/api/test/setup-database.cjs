const postgres=require('postgres'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
async function setupDatabase() {
 const url=process.env.TEST_ADMIN_DATABASE_URL;
 if(!url)throw Error('Set TEST_ADMIN_DATABASE_URL to a disposable PostgreSQL/PostGIS server. No production URLs are loaded.');
 const admin=postgres(url,{max:1,onnotice:()=>{}});
 const database='thumua_test_'+crypto.randomBytes(6).toString('hex');
 await admin.unsafe(`create database "${database}"`);
 const testUrl=new URL(url);testUrl.pathname='/'+database;
 const migration=postgres(testUrl.href,{max:1,onnotice:()=>{}});
 try {
  await migration.unsafe(fs.readFileSync(path.join(__dirname,'bootstrap.sql'),'utf8'));
  const directory=path.resolve(__dirname,'../../../supabase/migrations');
  for(const name of fs.readdirSync(directory).filter(n=>n.endsWith('.sql')).sort()) {
   try{await migration.begin(sql=>sql.unsafe(fs.readFileSync(path.join(directory,name),'utf8').replace(/^\uFEFF/,'')));console.warn('migration:',name);}
   catch(error){throw new Error('Migration '+name+': '+error.message,{cause:error});}
  }
  // Disposable test-only credentials, local/CI. Never overwrite an existing login password.
  for(const role of ['mambo_app','mambo_worker'])await migration.unsafe(`alter role ${role} login`);
  const appUrl=new URL(testUrl);appUrl.username='mambo_app';
  const workerUrl=new URL(testUrl);workerUrl.username='mambo_worker';
  return {database,admin:migration,appUrl:appUrl.href,workerUrl:workerUrl.href,async close(){await migration.end();await admin.end();}};
 }catch(error){await migration.end();await admin.end();throw error;}
}
module.exports={setupDatabase};
if(require.main===module)setupDatabase().then(async db=>{console.warn('Disposable database created:',db.database);await db.close();}).catch(e=>{console.error(e);process.exitCode=1;});
