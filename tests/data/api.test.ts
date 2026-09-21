import { afterEach, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiRequest } from '@/data/api';

const client = {auth:{getSession:async()=>({data:{session:{access_token:'test-token',user:{id:'alice'}}},error:null})}} as unknown as SupabaseClient;
afterEach(()=>vi.unstubAllGlobals());
it('không gửi thao tác của tài khoản cũ bằng phiên mới',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 await expect(apiRequest(client,'/legacy/commands',{method:'POST',userId:'bob'})).rejects.toMatchObject({code:'UNAUTHENTICATED'});
 expect(fetcher).not.toHaveBeenCalled();
});
it('giữ nguyên operation key và phân biệt lỗi phân quyền với hết gói',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:'PERMISSION_DENIED',message:'Denied'}),{status:403}));vi.stubGlobal('fetch',fetcher);
 await expect(apiRequest(client,'/legacy/commands',{method:'POST',userId:'alice',operationId:'stable-key',body:{test:true}})).rejects.toMatchObject({code:'PERMISSION_DENIED',status:403});
 expect(fetcher.mock.calls[0]?.[1].headers['Idempotency-Key']).toBe('stable-key');
});
