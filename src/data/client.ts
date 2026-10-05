import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createApiClient, type Client as ApiClient } from '@mambo/sdk';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const apiUrl = import.meta.env.VITE_API_URL?.trim();

let client: SupabaseClient | null = null;

if (url && publishableKey) {
  client = createSupabase(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

const ORG_STORAGE_KEY = 'thumua365_current_org_id';
let currentOrgId: string | null = null;
try {
  currentOrgId = typeof localStorage !== 'undefined' ? localStorage.getItem(ORG_STORAGE_KEY) : null;
} catch {
  // Trình duyệt chặn lưu
}

export const setCurrentOrg = (id: string | null) => {
  currentOrgId = id;
  try {
    if (id) localStorage.setItem(ORG_STORAGE_KEY, id);
    else localStorage.removeItem(ORG_STORAGE_KEY);
  } catch {
    // Trình duyệt chặn lưu
  }
};

export const getCurrentOrgId = (): string | null => currentOrgId;

export const supabase = client;
export const getSupabase = (): SupabaseClient | null => client;
export const hasBackend = (): boolean => client !== null && Boolean(apiUrl);

const makeApi = (orgId: () => string | null): ApiClient => createApiClient({
  baseUrl: (apiUrl ?? '').replace(/\/+$/, ''),
  getAccessToken: async () => {
    if (!apiUrl) throw new Error('Chưa cấu hình VITE_API_URL');
    return (await client?.auth.getSession())?.data.session?.access_token ?? null;
  },
  getOrganizationId: orgId,
  fetch: (input, init) => {
    if (!apiUrl) throw new Error('Chưa cấu hình VITE_API_URL');
    return fetch(input, init);
  },
});

export const api: ApiClient = makeApi(() => currentOrgId);

/** Header is captured for the entire sync, even across token refresh/org switching. */
export const apiForOrg = (orgId: string): ApiClient => {
  if (!orgId) throw new Error('Chưa chọn tổ chức');
  return makeApi(() => orgId);
};
