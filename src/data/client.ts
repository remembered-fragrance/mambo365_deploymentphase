import { AuthClient, type GoTrueClient } from '@supabase/auth-js';
import type { Me } from '@mambo/contracts';
import { createClient as createApiClient, type Client as ApiClient } from '@mambo/sdk';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const apiUrl = import.meta.env.VITE_API_URL?.trim();

/**
 * Chỉ phần Auth của Supabase. App không đọc bảng, không realtime, không storage trực tiếp —
 * mọi thứ đi qua API — mà `createClient` của supabase-js kéo cả bốn thứ đó vào JS khởi tạo
 * (~110KB chưa nén). Cấu hình chép đúng `createClient` (supabase-js 2.112): cùng khoá lưu
 * phiên `sb-<ref>-auth-token` ⇒ người đang đăng nhập không bị đăng xuất khi đổi.
 */
export interface SupabaseAuth {
  readonly auth: GoTrueClient;
}

let client: SupabaseAuth | null = null;

if (url && publishableKey) {
  const base = new URL(url.endsWith('/') ? url : `${url}/`);
  client = {
    auth: new AuthClient({
      url: new URL('auth/v1', base).href,
      headers: { Authorization: `Bearer ${publishableKey}`, apikey: publishableKey },
      storageKey: `sb-${base.hostname.split('.')[0]}-auth-token`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    }),
  };
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
export const getSupabase = (): SupabaseAuth | null => client;
export const hasBackend = (): boolean => client !== null && Boolean(apiUrl);

/**
 * Đánh thức API ngay lúc mở app. API trên gói free của Render ngủ sau 15 phút không ai gọi và
 * mất 20–50 giây để dậy; gọi sớm thì lúc người dùng gõ xong mật khẩu, hay lúc sổ cần đồng bộ,
 * API đã thức. `/v1/health` công khai, GET không header riêng ⇒ không tốn preflight CORS.
 * API lên gói không ngủ thì tắt bằng `VITE_API_WARMUP=off` (Thumua365_BE/ops/README.md).
 */
export const warmUpApi = (): void => {
  if (!apiUrl || import.meta.env.VITE_API_WARMUP === 'off') return;
  fetch(`${apiUrl.replace(/\/+$/, '')}/v1/health`, { cache: 'no-store' }).catch(() => undefined);
};

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

let meInFlight: Promise<Me> | null = null;

/**
 * `GET /v1/me` dùng chung. Mở app là store và gói dịch vụ cùng hỏi một lúc; mỗi lần là một lượt
 * hỏi Supabase Auth cộng hai transaction ở API ⇒ lời gọi đang bay thì đi chung, không gửi thêm.
 */
export const fetchMe = (): Promise<Me> => {
  meInFlight ??= api.me().finally(() => {
    meInFlight = null;
  });
  return meInFlight;
};

/** Header is captured for the entire sync, even across token refresh/org switching. */
export const apiForOrg = (orgId: string): ApiClient => {
  if (!orgId) throw new Error('Chưa chọn tổ chức');
  return makeApi(() => orgId);
};
