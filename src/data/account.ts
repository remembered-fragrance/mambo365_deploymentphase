import type { SupabaseClient } from '@supabase/supabase-js';
import { FeatureUnavailableError } from './capabilities';

export const deleteAccount = async (
  _supabase: SupabaseClient,
  _userId: string,
): Promise<void> => {
  throw new FeatureUnavailableError('Xoá tài khoản');
};
