import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/auth-js';
import { emptyData, normalize, starterData, withoutLegacyProducts } from '@mambo/core/normalize';
import type { AppData, SyncStatus, UserProfile } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { hasBook, type Feature, type Me, type MeBootstrapInput, type MeMembership } from '@mambo/contracts';
import type { MemberRole, OrgType, Permission, PlanSummary } from '@mambo/contracts';
import { deleteAccount, wipeOrgFromDevice } from './account';
import * as auth from './auth';
import { mergeProfile } from './authProfile';
import { createBookActions } from './bookActions';
import { readBook, writeBook, writeSyncMark } from './cache';
import { api, getCurrentOrgId, getSupabase, hasBackend, setCurrentOrg } from './client';
import { forgetDemo, isDemoActive } from './demoMode';
import { deviceAccount } from './deviceAccount';
import { forgetRecord } from './forgetRecord';
import { opProblem } from './opCheck';
import { clearCursor } from './localDb';
import { forgetMe, recallMe, rememberMe } from './meCache';
import {
  dropConflictedRecord, enqueue, legacyQueueCount, pendingCount, pendingRecordIds, retryConflicts, type NewOp,
} from './queue';
import { forgetSubscription } from './subscriptionStore';
import { looksOnline, markSyncStates, rebasePulled, saveSyncedBook, syncOnce, type SyncNotice } from './sync';
import { StoreContext, UnsentOpsError, type StoreValue } from './useStore';
const SYNC_INTERVAL_MS = 30_000;
const IDLE_STATUS: SyncStatus = { loading: false, pendingCount: 0 };
const NO_PERMISSIONS: readonly Permission[] = [];
const NO_FEATURES: readonly Feature[] = [];
/** Bản ghi một thao tác chạm tới — lần trả tiền chạm cả phiếu cha (như `pendingRecordIds`). */
const touchedIds = (op: NewOp): string[] => {
  const parentId = op.entity === 'payment' ? op.data?.transactionId : undefined;
  return typeof parentId === 'string' ? [op.recordId, parentId] : [op.recordId];
};
export function StoreProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [status, setStatus] = useState<SyncStatus>({ loading: true, pendingCount: 0 });
  /** Có thao tác bị máy chủ từ chối đang chặn cả hàng — giao diện hiện nút "Gửi lại" / "Bỏ". */
  const [stuck, setStuck] = useState(false);
  /** Số thao tác đã tự bỏ vì chủ đổi chi nhánh (cộng dồn) — giao diện báo mỗi khi số này tăng. */
  const [branchDropped, setBranchDropped] = useState(0);
  /** Op máy chủ đã nhận kèm cảnh báo (cộng dồn trong phiên) — giao diện báo từng cái khi danh sách dài thêm. */
  const [syncWarnings, setSyncWarnings] = useState<readonly SyncNotice[]>([]);
  const latest = useRef(data);
  /** Tài khoản Supabase của phiên — bù SĐT / email khôi phục mà `/v1/me` chưa trả. */
  const authUser = useRef<User | null>(null);
  const syncing = useRef(false);
  const selected = useRef<string | null>(null);
  const readyKey = useRef<string | null>(null);
  const generation = useRef(0);
  /**
   * Tăng mỗi khi sổ trên màn hình được THAY hẳn (đổi tổ chức, nạp file, dữ liệu mẫu, xoá hết, bỏ thao
   * tác kẹt). Lượt đồng bộ bắt đầu trước đó không được gộp vào sổ mới. Ghi thêm phiếu thì không tăng:
   * phần kéo về được gộp lại vào sổ mới nhất, không bỏ cả lượt.
   */
  const bookEpoch = useRef(0);
  /** Tăng khi người dùng bấm Gửi lại / Bỏ: lượt đồng bộ đang chạy dở không được bật lại banner kẹt. */
  const stuckEpoch = useRef(0);
  /** Có người gọi đồng bộ trong lúc đang chạy — chạy thêm một lượt ngay khi xong. */
  const rerun = useRef(false);
  /** Bản ghi của các commit đã lên màn hình nhưng thao tác chưa vào hàng đợi. */
  const inflight = useRef(new Map<string, number>());
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
  const syncsWithServer = Boolean(getSupabase() && hasBackend() && currentOrg && hasBook(currentOrg.organization.type) &&
    currentOrg.permissions.includes('book:sync') && plan && plan.tier !== 'free' && !status.blocked);
  /** Nối một việc ghi xuống máy vào chuỗi. Chuỗi không bao giờ được reject: reject một lần là mọi commit sau bị bỏ qua. */
  const persist = useCallback((task: () => Promise<void>) => {
    persistence.current = persistence.current.then(task).catch((error: unknown) => {
      setStatus((previous) => ({ ...previous, error: error instanceof Error ? error.message : 'Local save failed' }));
    });
  }, []);
  /**
   * Bản `kickSync` mới nhất cho effect nạp sổ. `kickSync` đổi danh tính mỗi lần `/v1/me` trả
   * lời (kể cả trả y hệt); effect nạp sổ phụ thuộc thẳng vào nó thì mỗi lần như thế lại xoá
   * sổ đang hiện rồi đọc lại IndexedDB — mở app bằng bản `/v1/me` đã nhớ sẽ nháy trống.
   */
  const kickSyncRef = useRef<() => void>(() => undefined);
  const activateOrg = useCallback((orgId: string | null) => {
    generation.current++;
    bookEpoch.current++;
    readyKey.current = null;
    selected.current = orgId;
    setCurrentOrg(orgId);
    setCurrentOrgIdState(orgId);
    show(emptyData());
    setStatus(IDLE_STATUS);
    setStuck(false);
  }, [show]);
  const kickSync = useCallback(() => {
    const supabase = getSupabase();
    if (!supabase || !hasBackend() || !currentOrg || !activeKey ||
      selected.current !== activeKey || readyKey.current !== activeKey ||
      !looksOnline() || isDemoActive(activeKey) || !hasBook(currentOrg.organization.type) ||
      !currentOrg.permissions.includes('book:sync')) return;
    // Bấm "Gửi lại" đúng lúc đang đồng bộ thì không phải đợi 30 giây cho lượt hẹn giờ.
    if (syncing.current) {
      rerun.current = true;
      return;
    }
    const epoch = bookEpoch.current;
    const stuckMark = stuckEpoch.current;
    const isCurrent = () => epoch === bookEpoch.current;
    syncing.current = true;
    void persistence.current.then(() => {
      if (!isCurrent()) return;
      return syncOnce(supabase, activeKey, latest.current, isCurrent);
    })
      .then((outcome) => {
        if (!outcome || !isCurrent()) return;
        if (outcome.dropped > 0) setBranchDropped((n) => n + outcome.dropped);
        if (outcome.warnings.length > 0) setSyncWarnings((list) => [...list, ...outcome.warnings]);
        // Ghi trong chuỗi, sau mọi commit đã có: gộp phần kéo về vào sổ MỚI NHẤT chứ không đè bằng
        // ảnh chụp lúc bắt đầu kéo — phiếu ghi trong lúc kéo vẫn còn, tiến độ kéo cũng không mất.
        persist(async () => {
          if (!isCurrent()) return;
          const pending = await pendingRecordIds(activeKey);
          for (const id of inflight.current.keys()) pending.add(id);
          if (stuckMark === stuckEpoch.current) setStuck(outcome.conflicts.length > 0);
          setStatus(outcome.status);
          const rebased = rebasePulled(latest.current, outcome.pulled, pending);
          if (!rebased) return;
          const book = markSyncStates(rebased, pending, outcome.conflicts);
          show(book);
          await saveSyncedBook(activeKey, book, outcome.cursor);
          if (outcome.syncedAt) await writeSyncMark(activeKey, outcome.syncedAt);
        });
      })
      .catch((error: unknown) => {
        if (isCurrent()) setStatus((previous) => ({
          ...previous, loading: false, error: error instanceof Error ? error.message : 'Sync failed',
        }));
      })
      .finally(() => {
        syncing.current = false;
        if (rerun.current) {
          rerun.current = false;
          kickSyncRef.current();
        }
      });
  }, [activeKey, currentOrg, persist, show]);
  useEffect(() => { kickSyncRef.current = kickSync; }, [kickSync]);
  const commit = useCallback((next: AppData, ops: NewOp[]) => {
    if (!activeKey || readyKey.current !== activeKey ||
      (getSupabase() && selected.current !== activeKey)) throw new Error('Organization book is not ready');
    const run = ++generation.current;
    const epoch = bookEpoch.current;
    // Dữ liệu mẫu chỉ sống trên máy: không xếp thao tác nào lên máy chủ. Chốt cờ ngay lúc ghi —
    // bật / tắt mẫu sau đó không được đổi số phận của thao tác này.
    const queued = isDemoActive(activeKey) || !currentOrgId ? [] : ops;
    // Chặn trước khi sổ đổi: lỗi nổi lên chỗ người dùng vừa bấm, sổ trên máy không lệch với máy chủ.
    const problem = queued.map(opProblem).find((p) => p !== null);
    if (problem) throw new Error(`${L.cannotSaveInvalid} (${problem})`);
    const ids = queued.flatMap(touchedIds);
    for (const id of ids) inflight.current.set(id, (inflight.current.get(id) ?? 0) + 1);
    show(next);
    persistence.current = persistence.current.then(async () => {
      try {
        for (const op of queued) if (currentOrgId) await enqueue({ ...op, orgId: currentOrgId });
      } finally {
        for (const id of ids) {
          const left = (inflight.current.get(id) ?? 1) - 1;
          if (left > 0) inflight.current.set(id, left);
          else inflight.current.delete(id);
        }
      }
      // Sổ mới nhất chứ không phải `next`: phần kéo về có thể đã gộp vào sau `next`. Đã sang sổ khác thì
      // `latest` là sổ kia, ghi `next` như cũ.
      await writeBook(activeKey, epoch === bookEpoch.current ? latest.current : next);
      const count = currentOrgId ? await pendingCount(currentOrgId) : 0;
      if (run === generation.current) setStatus((previous) => ({ ...previous, pendingCount: count }));
    }).catch((error: unknown) => {
      if (run === generation.current) setStatus((previous) => ({
        ...previous, error: error instanceof Error ? error.message : 'Local save failed',
      }));
    });
    void persistence.current.then(kickSync);
  }, [activeKey, currentOrgId, kickSync, show]);
  /** Thay cả sổ. `rebuild`: bỏ con trỏ để lần kéo sau dựng lại sổ từ máy chủ. */
  const replaceBook = useCallback((next: AppData, rebuild: boolean) => {
    bookEpoch.current++;
    commit(next, []);
    if (rebuild && currentOrgId) persist(() => clearCursor(currentOrgId));
  }, [commit, currentOrgId, persist]);
  const applyMe = useCallback((result: Me) => {
    memberships.current = result.memberships;
    setMe(result);
    setUser(auth.profileFromMe(result, authUser.current));
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
      rememberMe(result);
      applyMe(result);
      // Tên đăng nhập / email khôi phục nằm ở `profiles`; lỗi (chưa bootstrap, API cũ) ⇒ giữ bản /v1/me.
      if (result.memberships.length > 0) void api.account.profile().then((profile) => {
        if (epoch === sessionEpoch.current) setUser((u) => (u ? mergeProfile(u, profile) : u));
      }).catch(() => undefined);
      return result;
    } catch (error) {
      if (epoch !== sessionEpoch.current) return null;
      setStatus((previous) => ({
        ...previous, loading: false,
        error: error instanceof Error ? error.message : 'Cannot validate membership'
      }));
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
  /**
   * Vào phiên vừa có (mở app, đăng nhập, đăng ký). `/v1/me` lỗi — Render đang khởi động,
   * mất mạng — vẫn phải có `user` từ phiên Supabase, không thì cổng giữ nguyên màn đăng
   * nhập mà không báo gì ("đăng nhập không chuyển trang"); lỗi hiện ở thanh đồng bộ.
   */
  const enterSession = useCallback(async (account: User): Promise<void> => {
    const epoch = sessionEpoch.current;
    if (await refreshMe()) return;
    if (epoch === sessionEpoch.current) setUser(auth.profileFromAccount(account));
  }, [refreshMe]);
  const bootstrap = useCallback(async (input: MeBootstrapInput): Promise<Me> => {
    const epoch = sessionEpoch.current;
    const result = await auth.bootstrap(input);
    if (epoch !== sessionEpoch.current) throw new Error('Session changed');
    rememberMe(result);
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
      authUser.current = session.user;
      // Có bản `/v1/me` lần trước ⇒ vào sổ ngay, hỏi lại máy chủ ở nền (xem meCache.ts).
      const cached = recallMe(session.user.id);
      if (cached) {
        applyMe(cached);
        void refreshMe();
        return;
      }
      await enterSession(session.user);
    });
  }, [applyMe, enterSession, refreshMe]);
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
      // Sổ chỉ nằm trên máy (không có máy chủ) mới có sẵn mặt hàng mẫu. Sổ của tổ chức thì không:
      // id `prod-…` máy chủ không nhận, lập phiếu bằng chúng là kẹt hàng đợi.
      show(currentOrgId ? withoutLegacyProducts(cached ?? emptyData()) : (cached ?? starterData()));
      readyKey.current = activeKey;
      const count = currentOrgId ? await pendingCount(currentOrgId) : 0;
      const legacyCount = await legacyQueueCount();
      if (cancelled || (currentOrgId && selected.current !== currentOrgId)) return;
      setStatus({
        loading: false, pendingCount: count,
        error: legacyCount > 0 ? 'Có thao tác cũ chưa xác định tổ chức, đã cách ly để tránh gửi nhầm.' : undefined
      });
      kickSyncRef.current();
    }).catch((error: unknown) => {
      if (!cancelled) setStatus({
        loading: false, pendingCount: 0,
        error: error instanceof Error ? error.message : 'Cannot load local book'
      });
    });
    return () => { cancelled = true; };
  }, [activeKey, currentOrgId, show]);
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
      bookKey: activeKey,
      syncsWithServer,
      bootstrap,
      selectOrg,
      refreshMe,
      ...createBookActions({ book: () => latest.current, commit, userId: activeKey ?? '' }),
      importData: (payload) => {
        // Sổ đang đồng bộ là sổ của máy chủ: thay trên máy bằng file thì máy chủ, máy khác không có,
        // lần kéo sau còn trộn hai sổ vào nhau. Dữ liệu mẫu thì được — nó không bao giờ rời máy.
        if (syncsWithServer && !isDemoActive(activeKey)) throw new Error(L.importWhileSyncing);
        replaceBook(normalize(payload), false);
      },
      // Sổ trống mà con trỏ còn thì lần kéo sau không dựng lại sổ từ máy chủ.
      reset: () => replaceBook(currentOrgId ? emptyData() : starterData(), true),
      stuck,
      branchDropped,
      syncWarnings,
      retryStuck: () => {
        if (!currentOrgId) return;
        stuckEpoch.current++;
        setStuck(false);
        void retryConflicts(currentOrgId).then(kickSync);
      },
      dropStuck: () => {
        if (!currentOrgId) return;
        stuckEpoch.current++;
        setStuck(false);
        void dropConflictedRecord(currentOrgId).then((dropped) => {
          // Máy chủ không có thao tác này: bản ghi trên máy phải về đúng như máy chủ. Thêm mới thì bỏ
          // hẳn; sửa / xoá thì dựng lại sổ từ máy chủ (bản ghi hết thao tác chờ nên bản máy chủ thắng).
          if (dropped) replaceBook(
            dropped.kind === 'insert' ? forgetRecord(latest.current, dropped.entity, dropped.recordId) : latest.current,
            true,
          );
          kickSync();
        }).catch((error: unknown) => {
          setStatus((previous) => ({ ...previous, error: error instanceof Error ? error.message : 'Cannot drop operation' }));
        });
      },
      signIn: async (identifier, password) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');

        sessionEpoch.current++;
        activateOrg(null);
        memberships.current = [];
        setMe(null);
        authUser.current = await auth.signIn(supabase, identifier, password);
        await enterSession(authUser.current);
      },
      signUp: async (input) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        sessionEpoch.current++;
        activateOrg(null);
        memberships.current = [];
        setMe(null);
        authUser.current = await auth.signUp(supabase, input);
        await enterSession(authUser.current);
      },
      openRecoverySession: async (tokenHash) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        sessionEpoch.current++;
        activateOrg(null);
        memberships.current = [];
        setMe(null);
        authUser.current = await auth.openRecoverySession(supabase, tokenHash);
        await enterSession(authUser.current);
      },
      signOut: async (options) => {
        // Khoá commit trong lúc đếm: thao tác lọt vào giữa lúc đếm và lúc dọn sẽ bị xoá mà không ai biết.
        const key = readyKey.current;
        const book = selected.current;
        readyKey.current = null;
        const orgIds = memberships.current.map((m) => m.organization.id);
        try {
          await persistence.current;
          let unsent = 0;
          for (const orgId of orgIds) unsent += await pendingCount(orgId);
          // Máy dùng chung: thao tác của người này không được gửi bằng phiên người sau. Bỏ thì phải hỏi.
          if (unsent > 0 && !options?.discardUnsent) throw new UnsentOpsError(unsent);
        } catch (error) {
          if (readyKey.current === null && selected.current === book) readyKey.current = key;
          throw error;
        }
        sessionEpoch.current++;
        authUser.current = null;
        activateOrg(null);
        memberships.current = [];
        await persistence.current;
        const supabase = getSupabase();
        if (supabase) await auth.signOut(supabase);
        for (const orgId of orgIds) {
          await wipeOrgFromDevice(orgId);
          forgetSubscription(orgId);
        }
        if (!supabase && userId) await wipeOrgFromDevice(userId);
        forgetDemo(userId ? [...orgIds, userId] : orgIds);
        if (userId) forgetMe(userId);
        setCurrentOrg(null);
        setCurrentOrgIdState(null);
        setUser(null);
        setMe(null);
        show(emptyData());
      },
      updateProfile: async (patch) => {
        const supabase = getSupabase();
        if (!supabase || !userId) throw new Error('Chưa cấu hình máy chủ');
        const saved = await auth.updateProfile(supabase, userId, patch);
        setUser((current) => (current ? mergeProfile(current, saved) : current));
      },
      changePassword: async (password) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        await auth.changePassword(supabase, password);
      },
      deleteAccount: async () => {
        if (!getSupabase() || !userId) throw new Error('Chưa cấu hình máy chủ');
        // Ghi dở phải xong trước — không thì một lần ghi sổ đang chờ dựng lại đúng cái sổ vừa dọn.
        await persistence.current;
        await deleteAccount(memberships.current.map((m) => m.organization.id));
        // Tài khoản đã xoá trên máy chủ: thao tác còn lại (nếu có) không còn chỗ nào để gửi.
        await value.signOut({ discardUnsent: true });
      },
      syncNow: kickSync,
    }),
    [
      activateOrg, data, status, stuck, branchDropped, syncWarnings, user, me, currentOrgId, currentOrg, orgType,
      userRole, permissions, features, plan, needsBootstrap, syncsWithServer, bootstrap,
      selectOrg, refreshMe, enterSession, activeKey, commit, replaceBook, kickSync, userId, show,
    ],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
