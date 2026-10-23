import type { SupabaseClient } from '@supabase/supabase-js';
import { api } from './client';

export const deleteAccount = async (
  _supabase: SupabaseClient,
  _userId: string,
): Promise<void> => {
  await api.account.delete();
};
