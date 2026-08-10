/**
 * StoreProvider — ghi cục bộ trước, đẩy lên sau.
 *
 * Mọi action: tính sổ mới bằng hàm thuần của `core/`, hiện ngay lên màn hình,
 * ghi xuống IndexedDB, xếp thao tác vào hàng đợi, rồi mới đẩy lên nền.
 * Người dùng không bao giờ phải chờ mạng để cân xong một chuyến hàng.
 *
 * Danh sách 22 action nằm ở `bookActions.ts`; file này lo vòng đời React,
 * phiên đăng nhập và vòng đồng bộ.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyData } from '@/core/normalize';
import type { AppData, SyncStatus, UserProfile } from '@/core/types';
import * as auth from './auth';
import { createBookActions } from './bookActions';
import { clearUserCache, readBook, writeBook } from './cache';
import { getSupabase } from './client';
import { deviceAccount } from './deviceAccount';
import { clearQueue, enqueue, type NewOp } from './queue';
import { looksOnline, syncOnce } from './sync';
import { StoreContext, type StoreValue } from './useStore';

const SYNC_INTERVAL_MS = 30_000;
const IDLE_STATUS: SyncStatus = { loading: false, pendingCount: 0 };

export function StoreProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [status, setStatus] = useState<SyncStatus>({ loading: true, pendingCount: 0 });

  // Bản sổ mới nhất, cập nhật ngay khi commit chứ không đợi React vẽ lại.
  // Mọi action đọc từ đây, không đọc từ biến `data` của lần vẽ hiện tại.
  const latest = useRef(data);
  const syncing = useRef(false);

  const userId = user?.id ?? null;

  const show = useCallback((next: AppData) => {
    latest.current = next;
    setData(next);
  }, []);

  const kickSync = useCallback(() => {
    const supabase = getSupabase();
    if (!supabase || !userId || !looksOnline() || syncing.current) return;

    syncing.current = true;
    void syncOnce(supabase, userId, latest.current)
      .then((outcome) => {
        show(outcome.data);
        setStatus(outcome.status);
      })
      .finally(() => {
        syncing.current = false;
      });
  }, [userId, show]);

  /**
   * Hiện ngay → ghi máy → xếp hàng đợi → đẩy nền. Đúng thứ tự đó.
   *
   * 🔴 `latest.current` đổi NGAY, không đợi React vẽ lại. Một lần bấm có thể
   * gọi hai action liên tiếp (chốt phiếu rồi xoá nháp); nếu action thứ hai vẫn
   * tính từ ảnh chụp sổ trước đó thì nó ghi đè kết quả của action thứ nhất và
   * phiếu vừa lập biến mất.
   */
  const commit = useCallback(
    (next: AppData, ops: NewOp[]) => {
      show(next);
      if (!userId) return;
      void writeBook(userId, next);
      void Promise.all(ops.map(enqueue)).then(kickSync);
    },
    [userId, kickSync, show],
  );

  // ─── Phiên đăng nhập ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      // Chưa có máy chủ thì dùng tài khoản của máy này — sổ vẫn ghi được và
      // vẫn còn nguyên sau khi tắt app.
      setUser(deviceAccount());
      setStatus(IDLE_STATUS);
      return;
    }
    void supabase.auth.getUser().then(async ({ data: session }) => {
      setUser(session.user ? await auth.loadProfile(supabase, session.user) : null);
      setStatus(IDLE_STATUS);
    });
  }, []);

  // ─── Đọc sổ từ máy khi đổi tài khoản ─────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      show(emptyData());
      return;
    }
    void readBook(userId).then((cached) => {
      show(cached ?? emptyData());
      kickSync();
    });
  }, [userId, kickSync, show]);

  // ─── Đồng bộ định kỳ và khi có mạng lại ──────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(kickSync, SYNC_INTERVAL_MS);
    window.addEventListener('online', kickSync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', kickSync);
    };
  }, [userId, kickSync]);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      status,
      user,

      ...createBookActions({ book: () => latest.current, commit, userId: userId ?? '' }),

      signIn: async (identifier, password) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        const account = await auth.signIn(supabase, identifier, password);
        await clearQueue();
        setUser(await auth.loadProfile(supabase, account));
      },

      signUp: async (input) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Chưa cấu hình máy chủ');
        const account = await auth.signUp(supabase, input);
        setUser(await auth.loadProfile(supabase, account));
      },

      signOut: async () => {
        const supabase = getSupabase();
        if (supabase) await auth.signOut(supabase);
        if (userId) await clearUserCache(userId);
        await clearQueue();
        setUser(null);
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

      syncNow: kickSync,
    }),
    [data, status, user, userId, commit, kickSync, show],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
