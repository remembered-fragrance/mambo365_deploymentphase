import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteAccount } from '@/data/account';
import { uploadAttachment, removeAttachment, signedAttachmentUrl, cacheRemoteAttachment } from '@/data/attachments';
import { createPaymentIntent, fetchPaymentIntents, claimReferral } from '@/data/billing';
import { updateProfile } from '@/data/auth';

it('reports unavailable features without deleting local/account data or inventing billing results', async () => {
  const signOut = vi.fn();
  const auth = { auth: { signOut } } as unknown as SupabaseClient;
  const operations = [
    deleteAccount(auth, 'user'),
    uploadAttachment(auth, 'user', 'id', new Blob()),
    removeAttachment(auth, 'user', 'id'),
    signedAttachmentUrl(auth, 'user', 'id'),
    cacheRemoteAttachment(auth, 'user', 'id'),
    createPaymentIntent(auth, 'user', null, 100),
    fetchPaymentIntents(auth, 'user'),
    claimReferral(auth, 'CODE'),
    updateProfile(auth, 'user', { name: 'New' }),
  ];
  for (const operation of operations) {
    await expect(operation).rejects.toMatchObject({ code: 'FEATURE_UNAVAILABLE' });
  }
  expect(signOut).not.toHaveBeenCalled();
});
