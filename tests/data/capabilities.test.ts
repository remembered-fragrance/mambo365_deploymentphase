import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteAccount } from '@/data/account';
import { uploadAttachment, removeAttachment, signedAttachmentUrl, cacheRemoteAttachment } from '@/data/attachments';
import { createPaymentIntent, fetchPaymentIntents, claimReferral } from '@/data/billing';
import { getAccountProfile, updateProfile } from '@/data/auth';

it('reports unavailable features without inventing billing results or deleting local/account data', async () => {
  const signOut = vi.fn();
  const auth = { auth: { signOut } } as unknown as SupabaseClient;
  const operations = [
    () => uploadAttachment(auth, 'user', 'id', new Blob()),
    () => removeAttachment(auth, 'user', 'id'),
    () => signedAttachmentUrl(auth, 'user', 'id'),
    () => cacheRemoteAttachment(auth, 'user', 'id'),
    () => createPaymentIntent(auth, 'user', null, 100),
    () => fetchPaymentIntents(auth, 'user'),
  ];
  for (const operation of operations) {
    await expect(operation()).rejects.toMatchObject({ code: 'FEATURE_UNAVAILABLE' });
  }
  await expect(deleteAccount(auth, 'user')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(signOut).not.toHaveBeenCalled();
});

it('uses the backend profile API instead of reporting profile updates unavailable', async () => {
  const auth = { auth: { signOut: vi.fn() } } as unknown as SupabaseClient;
  // The SDK reaches its authenticated request boundary; this test has no login token.
  await expect(updateProfile(auth, 'user', { name: 'New' }))
    .rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
});

it('uses the installed account API for referral claims and account deletion', async () => {
  const auth = { auth: { signOut: vi.fn() } } as unknown as SupabaseClient;
  await expect(getAccountProfile())
    .rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  await expect(claimReferral(auth, 'CODE'))
    .rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  await expect(deleteAccount(auth, 'user'))
    .rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
});
