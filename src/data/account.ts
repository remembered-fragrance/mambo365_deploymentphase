/** Request account deletion through the API; shared business records retain their audit history. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiRequest } from './api';
import { clearUserCache } from './cache';
import { forgetSubscription } from './subscriptionStore';
export const deleteAccount = async (supabase:SupabaseClient,userId:string):Promise<void> => {
 await apiRequest(supabase,'/account/deletion-requests',{method:'POST',userId,operationId:'account-delete:'+userId,body:{}});
 await clearUserCache(userId);
 forgetSubscription(userId);
 await supabase.auth.signOut();
};
