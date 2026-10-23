import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@/core/types';
import { profileForSelectedMembership } from '@/data/auth';

describe('profileForSelectedMembership', () => {
  const profile: UserProfile = {
    id: 'user-id',
    identifier: '+84900000000',
    name: 'Chủ vườn',
    businessName: 'Tên cũ',
  };

  it('uses the selected organization name, not the first membership name', () => {
    const selected = { organization: { id: 'farmer-org', type: 'farmer' as const, name: 'Vườn đang chọn' } };
    expect(profileForSelectedMembership(profile, selected).businessName).toBe('Vườn đang chọn');
  });

  it('clears organization name when no membership is selected', () => {
    expect(profileForSelectedMembership(profile, null).businessName).toBeUndefined();
  });
});
