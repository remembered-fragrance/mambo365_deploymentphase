import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteAccount } from '@/data/account';

it('reports unavailable features without deleting local/account data', async () => {
  const signOut = vi.fn();
  const auth = { auth: { signOut } } as unknown as SupabaseClient;
  const operations = [
    deleteAccount(auth, 'user'),
  ];
  for (const operation of operations) {
    await expect(operation).rejects.toMatchObject({ code: 'FEATURE_UNAVAILABLE' });
  }
  expect(signOut).not.toHaveBeenCalled();
});
