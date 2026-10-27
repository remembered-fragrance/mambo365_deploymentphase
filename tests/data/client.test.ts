import { afterEach, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@supabase/auth-js', () => ({
  AuthClient: class {
    getSession = getSession;
  },
}));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

it('captures organization headers across an asynchronous token refresh and organization switch', async () => {
  vi.stubEnv('VITE_API_URL', 'https://backend.example');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://auth.example');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test');
  let resolveToken: (value: unknown) => void = () => {};
  getSession.mockImplementation(() => new Promise((resolve) => { resolveToken = resolve; }));
  const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    error: { code: 'PLAN_EXPIRED', message: 'Expired' },
  }), { status: 403 }));
  vi.stubGlobal('fetch', transport);
  const { apiForOrg, setCurrentOrg } = await import('@/data/client');
  setCurrentOrg('org-a');
  const request = apiForOrg('org-a').sync.push({ deviceId: 'device', ops: [] });
  setCurrentOrg('org-b');
  resolveToken({ data: { session: { access_token: 'token' } } });
  await expect(request).rejects.toMatchObject({ code: 'PLAN_EXPIRED' });
  expect(transport.mock.calls[0]?.[1].headers['x-organization-id']).toBe('org-a');
});

it('GET /v1/me đang bay thì lời gọi sau đi chung, xong rồi mới gửi lượt mới', async () => {
  vi.stubEnv('VITE_API_URL', 'https://backend.example');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://auth.example');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test');
  getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
  const me = {
    user: { id: '11111111-1111-4111-8111-111111111111', name: null, phone: null, email: null, phoneVerified: false },
    memberships: [],
    pendingLinks: 0,
  };
  const transport = vi.fn(async () => new Response(JSON.stringify(me), { status: 200 }));
  vi.stubGlobal('fetch', transport);
  const { fetchMe } = await import('@/data/client');
  const [a, b] = await Promise.all([fetchMe(), fetchMe()]);
  expect(a).toEqual(me);
  expect(b).toBe(a);
  expect(transport).toHaveBeenCalledTimes(1);
  await fetchMe();
  expect(transport).toHaveBeenCalledTimes(2);
});

it('warmUpApi gọi /v1/health, trừ khi VITE_API_WARMUP=off', async () => {
  vi.stubEnv('VITE_API_URL', 'https://backend.example/');
  const transport = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', transport);
  (await import('@/data/client')).warmUpApi();
  expect(transport).toHaveBeenCalledWith('https://backend.example/v1/health', { cache: 'no-store' });

  vi.resetModules();
  transport.mockClear();
  vi.stubEnv('VITE_API_WARMUP', 'off');
  (await import('@/data/client')).warmUpApi();
  expect(transport).not.toHaveBeenCalled();
});

it('does not send requests when API configuration is missing', async () => {
  vi.stubEnv('VITE_API_URL', '');
  const transport = vi.fn();
  vi.stubGlobal('fetch', transport);
  const { api, hasBackend } = await import('@/data/client');
  await expect(api.health()).rejects.toThrow('VITE_API_URL');
  expect(hasBackend()).toBe(false);
  expect(transport).not.toHaveBeenCalled();
});
