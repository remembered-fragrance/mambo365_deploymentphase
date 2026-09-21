import type { SupabaseClient } from '@supabase/supabase-js';

const base=(import.meta.env.VITE_API_URL??'/api/v1').replace(/\/$/,'');
export class ApiError extends Error {
 readonly code:string;
 readonly status:number;
 constructor(code:string,message:string,status:number){super(message);this.name='ApiError';this.code=code;this.status=status;}
}
export async function apiRequest<T>(supabase:SupabaseClient,path:string,options:{method?:string;body?:unknown;operationId?:string;workspaceId?:string;userId?:string}={}):Promise<T>{
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw new ApiError('UNAUTHENTICATED','Phiên đăng nhập đã hết hạn.',401);
 if(options.userId&&data.session.user.id!==options.userId)throw new ApiError('UNAUTHENTICATED','Tài khoản đã thay đổi. Dữ liệu chờ vẫn được giữ.',401);
 const method=options.method??'GET',headers:Record<string,string>={Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'};
 if(options.workspaceId)headers['X-Workspace-Id']=options.workspaceId;
 if(method!=='GET')headers['Idempotency-Key']=options.operationId??crypto.randomUUID();
 const res=await fetch(base+path,{method,headers,body:options.body===undefined?undefined:JSON.stringify(options.body),signal:AbortSignal.timeout(20000)});
 const payload=await res.json() as T&{code?:string;message?:string};
 if(!res.ok)throw new ApiError(payload.code??'API_ERROR',typeof payload.message==='string'?payload.message:'Không xử lý được yêu cầu.',res.status);
 return payload;
}
