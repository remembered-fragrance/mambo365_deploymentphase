import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountProfile, ProfilePatch } from '../auth';
import { getAccountProfile } from '../auth';
import { api, hasBackend } from '../client';
import { useStore } from '../useStore';

export function useAccountProfile() {
  const { user, updateProfile, claimReferral, pendingReferralCode } = useStore();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!hasBackend()) {
      if (requestId === requestSequence.current) {
        setError('Không có cấu hình API để tải hồ sơ tài khoản.');
        setProfile(null);
      }
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getAccountProfile();
      if (requestId !== requestSequence.current) return null;
      setProfile(result);
      return result;
    } catch (cause) {
      if (requestId === requestSequence.current) setError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ tài khoản.');
      return null;
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requests = requestSequence;
    setProfile(null);
    if (userId) void refresh();
    else {
      requests.current++;
      setLoading(false);
      setError(null);
    }
    return () => { requests.current++; };
  }, [refresh, userId]);

  const save = useCallback(async (patch: ProfilePatch) => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateProfile(patch);
      setProfile(result);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được hồ sơ tài khoản.');
      throw cause;
    } finally {
      setSaving(false);
    }
  }, [updateProfile]);

  const sendVerification = useCallback(async () => {
    setError(null);
    try {
      const result = await api.account.verifyRecoveryEmail();
      if (result.status === 'already_verified') {
        setProfile((current) => current ? { ...current, recoveryEmailVerified: true } : current);
      }
      return result.status;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không gửi được email xác nhận.');
      throw cause;
    }
  }, []);

  const submitReferral = useCallback(async (code: string) => {
    setError(null);
    try {
      const claimed = await claimReferral(code);
      if (claimed) setProfile((current) => current ? { ...current, referred: true } : current);
      return claimed;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không ghi nhận được mã giới thiệu.');
      throw cause;
    }
  }, [claimReferral]);

  return { profile, loading, saving, error, refresh, save, sendVerification, submitReferral, pendingReferralCode };
}

export type AccountProfileController = ReturnType<typeof useAccountProfile>;
