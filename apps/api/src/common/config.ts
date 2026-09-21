export function validateConfig(config:Record<string,unknown>) {
 if(config.PERSISTENCE&&config.PERSISTENCE!=='postgres')throw new Error('Runtime only supports PERSISTENCE=postgres');
 if(!config.DATABASE_URL)throw new Error('DATABASE_URL is required');
 if(!config.SUPABASE_JWT_ISSUER)throw new Error('SUPABASE_JWT_ISSUER is required');
 const issuer=new URL(String(config.SUPABASE_JWT_ISSUER));
 if(config.NODE_ENV==='production') {
  if(issuer.protocol!=='https:')throw new Error('Production issuer requires HTTPS');
  if(!config.CORS_ORIGINS||String(config.CORS_ORIGINS).includes('*'))throw new Error('Configure explicit CORS_ORIGINS');
  if(!config.SUPABASE_URL||!config.SUPABASE_STORAGE_KEY)throw new Error('Configure private Supabase Storage');
  if(config.DB_SSL!=='require')throw new Error('Production requires DB_SSL=require');
 }
 return config;
}
