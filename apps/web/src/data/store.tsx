import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyData } from '@/core/normalize';
import type { AppData, SyncStatus, UserProfile } from '@/core/types';
import {
  hasBook,
  type Feature,
  type Me,
  type MeBootstrapInput,
  type MeMembership,
  type MemberRole,
  type OrgType,
  type Permission,
  type PlanSummary,
} from '@mambo/contracts';
import { deleteAccount } from './account';
import * as auth from './auth';
import { createBookActions } from './bookActions';
import { clearOrgCache, clearUserCache, readBook, writeBook } from './cache';
import { getCurrentOrgId, getSupabase, hasBackend, setCurrentOrg } from './client';
import { deviceAccount } from './deviceAccount';
import { enqueue, legacyQueueCount, pendingCount, type NewOp } from './queue';
import { forgetSubscription } from './subscriptionStore';
import { looksOnline, syncOnce } from './sync';
import { StoreContext, type StoreValue } from './useStore';
const SYNC_INTERVAL_MS = 30_000;
const IDLE_STATUS: SyncStatus = { loading: false, pendingCount: 0 };
const NO_PERMISSIONS: readonly Permission[] = [];
const NO_FEATURES: readonly Feature[] = [];
export function StoreProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [status, setStatus] = useState<SyncStatus>({ loading: true, pendingCount: 0 });
  const latest = useRef(data);
  const syncing = useRef(false);
  const selected = useRef<string | null>(null);
  const readyKey = useRef<string | null>(null);
  const generation = useRef(0);
  const persistence = useRef<Promise<void>>(Promise.resolve());
  const memberships = useRef<readonly MeMembership[]>([]);
  const sessionEpoch = useRef(0);
  const userId = user?.id ?? null;
  const currentOrg = useMemo<MeMembership | null>(() => {
    if (!me?.memberships?.length) return null;
    return me.memberships.find((m) => m.organization.id === currentOrgId) ?? null;
  }, [me, currentOrgId]);
  const orgType: OrgType | null = currentOrg?.organization.type ?? null;
  const userRole: MemberRole | null = currentOrg?.role ?? null;
  const permissions = currentOrg?.permissions ?? NO_PERMISSIONS;
  const features = currentOrg?.features ?? NO_FEATURES;
  const plan: PlanSummary | null = currentOrg?.plan ?? null;
  const needsBootstrap = Boolean(user && me && me.memberships.length === 0);
  const show = useCallback((next: AppData) => {
    latest.current = next;
    setData(next);
  }, []);
  const activeKey = currentOrg?.organization.id ?? (!getSupabase() ? userId : null);
  const activateOrg = useCallback((orgId: string | null) => {
    generation.current++;
    readyKey.current = null;
    selected.current = orgId;
    setCurrentOrg(orgId);
    setCurrentOrgIdState(orgId);
    show(emptyData());
    setStatus(IDLE_STATUS);
  }, [show]);
  const kickSync = useCallback(() => {
    const supabase = getSupabase();
    if (!supabase || !hasBackend() || !currentOrg || !activeKey ||
        selected.current !== activeKey || readyKey.current !== activeKey ||
        !looksOnline() || syncing.current || !hasBook(currentOrg.organization.type) ||
        !currentOrg.permissions.includes('book:sync')) return;
    const run = generation.current;
    syncing.current = true;
    void persistence.current.then(() => {
      if (run !== generation.current) return;
      return syncOnce(supabase, activeKey, latest.current, () => run === generation.current);
    })
      .then((outcome) => {
        if (!outcome || run !== generation.current) return;
        show(outcome.data);
        setStatus(outcome.status);
      })
      .catch((error: unknown) => {
        if (run === generation.current) setStatus((previous) => ({
          ...previous, loading: false, error: error instanceof Error ? error.message : 'Sync failed',
        }));
      })
      .finally(() => { syncing.current = false; });
  }, [activeKey, currentOrg, show]);
  const commit = useCallback((next: AppData, ops: NewOp[]) => {
    if (!activeKey || readyKey.current !== activeKey ||
        (getSupabase() && selected.current !== activeKey)) throw new Error('Organization book is not ready');
    const run = ++generation.current;
    show(next);
    persistence.current = persistence.current.then(async () => {
      for (const op of ops) {
        if (currentOrgId) await enqueue({ ...op, orgId: currentOrgId });
      }
      await writeBook(activeKey, next);
      const count = currentOrgId ? await pendingCount(currentOrgId) : 0;
      if (run === generation.current) setStatus((previous) => ({ ...previous, pendingCount: count }));
    }).catch((error: unknown) => {
      if (run === generation.current) setStatus((previous) => ({
        ...previous, error: error instanceof Error ? error.message : 'Local save failed',
      }));
    });
    void persistence.current.then(kickSync);
  }, [activeKey, currentOrgId, kickSync, show]);
  const applyMe = useCallback((result: Me) => {
    memberships.current = result.memberships;
    setMe(result);
    setUser(auth.profileFromMe(result));
    const stored = getCurrentOrgId();
    const target = result.memberships.find((m) => m.organization.id === stored) ?? result.memberships[0];
    const orgId = target?.organization.id ?? null;
    if (selected.current !== orgId) activateOrg(orgId);
    else { setCurrentOrg(orgId); setCurrentOrgIdState(orgId); }
    if (!orgId) setStatus(IDLE_STATUS);
  }, [activateOrg]);
  const refreshMe = useCallback(async (): Promise<Me | null> => {
    const epoch = sessionEpoch.current;
    try {
      const result = await auth.getMe();
      if (epoch !== sessionEpoch.current) return null;
      applyMe(result);
      return result;
    } catch (error) {
      if (epoch !== sessionEpoch.current) return null;
      setStatus((previous) => ({ ...previous, loading: false,
        error: error instanceof Error ? error.message : 'Cannot validate membership' }));
      return null;
    }
  }, [applyMe]);
  const selectOrg = useCallback(async (orgId: string) => {
    if (!memberships.current.some((m) => m.organization.id === orgId)) {
      throw new Error('Not a member of this organization');
    }
    if (selected.current === orgId) return;
    activateOrg(orgId);
  }, [activateOrg]);
  const bootstrap = useCallback(async (input: MeBootstrapInput): Promise<Me> => {
    const epoch = sessionEpoch.current;
    const result = await auth.bootstrap(input);
    if (epoch !== sessionEpoch.current) throw new Error('Session changed');
    applyMe(result);
    return result;
  }, [applyMe]);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setCurrentOrg(null);
      setUser(deviceAccount());
      setStatus(IDLE_STATUS);
      return;
    }
    const epoch = sessionEpoch.current;
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (epoch !== sessionEpoch.current) return;
      if (!session) {
        setUser(null);
        setMe(null);
        setStatus(IDLE_STATUS);
        return;
      }
      const meData = await refreshMe();
      if (!meData) {
        const profile = await auth.loadProfile(supabase, session.user);
        if (epoch === sessionEpoch.current) setUser(profile);
      }
    });
  }, [refreshMe]);
  useEffect(() => {
    if (!activeKey) {
      show(emptyData());
      return;
    }
    let cancelled = false;
    readyKey.current = null;
    show(emptyData());
    void persistence.current.then(() => readBook(activeKey)).then(async (cached) => {
      if (cancelled || (currentOrgId && selected.current !== currentOrgId)) return;
      show(cached ?? emptyData());
      readyKey.current = activeKey;
      const count = currentOrgId ? await pendingCount(currentOrgId) : 0;
      const legacyCount = await legacyQueueCount();
      if (cancelled || (currentOrgId && selected.current !== currentOrgId)) return;
      setStatus({ loading: false, pendingCount: count,
        error: legacyCount > 0 ? 'Có thao tác cũ chưa xác định tổ chức, đã cách ly để tránh gửi nhầm.' : undefined });
      kickSync();
    }).catch((error: unknown) => {
      if (!cancelled) setStatus({ loading: false, pendingCount: 0,
        error: error instanceof Error ? error.message : 'Cannot load local book' });
    });
    return () => { cancelled = true; };
  }, [activeKey, currentOrgId, kickSync, show]);
  useEffect(() => {
    if (!activeKey || (orgType && !hasBook(orgType))) return;
    const timer = setInterval(kickSync, SYNC_INTERVAL_MS);
    window.addEventListener('online', kickSync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', kickSync);
    };
  }, [activeKey, orgType, kickSync]);
  const value = useMemo<StoreValue>(
    () => ({
      data,
      status,
      user,
      me,
      memberships: me?.memberships ?? [],
      currentOrgId,
      currentOrg,
      orgType,
      userRole,
      permissions,
      features,
      plan,
      needsBootstrap,
      bootstrap,
      selectOrg,
      refreshMe,
      ...createBookActions({ book: () => latest.current, commit, userId: activeKey ?? '' }),
      signIn: async (identifier, password) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        sessionEpoch.current++;
        activateOrg(null);
        memberships.current = [];
        setMe(null);
        await auth.signIn(supabase, identifier, password);
        await refreshMe();
      },
      signUp: async (input) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        sessionEpoch.current++;
        activateOrg(null);
        memberships.current = [];
        setMe(null);
        await auth.signUp(supabase, input);
        await refreshMe();
      },
      signOut: async () => {
        sessionEpoch.current++;
        activateOrg(null);
        memberships.current = [];
        await persistence.current;
        const supabase = getSupabase();
        if (supabase) await auth.signOut(supabase);
        if (userId) {
          await clearUserCache(userId);
          forgetSubscription(userId);
        }
        setCurrentOrg(null);
        setCurrentOrgIdState(null);
        setUser(null);
        setMe(null);
        show(emptyData());
      },
      updateProfile: async (patch) => {
        const supabase = getSupabase();
        if (!supabase || !userId) throw new Error('Chưa cấu hình máy chủ');
        await auth.updateProfile(supabase, userId, patch);
        setUser((current) => (current ? { ...current, ...patch } : current));
      },
      changePassword: async (password) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        await auth.changePassword(supabase, password);
      },
      deleteAccount: async () => {
        const supabase = getSupabase();
        if (!supabase || !userId) throw new Error('Chưa cấu hình máy chủ');
        await deleteAccount(supabase, userId);
        if (currentOrgId) await clearOrgCache(currentOrgId);
        setCurrentOrg(null);
        setCurrentOrgIdState(null);
        setUser(null);
        setMe(null);
        show(emptyData());
      },
      syncNow: kickSync,
    }),
    [
      activateOrg, data, status, user, me, currentOrgId, currentOrg, orgType,
      userRole, permissions, features, plan, needsBootstrap, bootstrap,
      selectOrg, refreshMe, activeKey, commit, kickSync, userId, show,
    ],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
