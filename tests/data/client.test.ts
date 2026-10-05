import { afterEach, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getSession } }),
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

it('does not send requests when API configuration is missing', async () => {
  vi.stubEnv('VITE_API_URL', '');
  const transport = vi.fn();
  vi.stubGlobal('fetch', transport);
  const { api, hasBackend } = await import('@/data/client');
  await expect(api.health()).rejects.toThrow('VITE_API_URL');
  expect(hasBackend()).toBe(false);
  expect(transport).not.toHaveBeenCalled();
});
