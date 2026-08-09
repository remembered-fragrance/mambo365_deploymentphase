/**
 * StoreProvider — ghi cục bộ trước, đẩy lên sau.
 *
 * Mọi action: tính sổ mới bằng hàm thuần của `core/`, hiện ngay lên màn hình,
 * ghi xuống IndexedDB, xếp thao tác vào hàng đợi, rồi mới đẩy lên nền.
 * Người dùng không bao giờ phải chờ mạng để cân xong một chuyến hàng.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as drafts from '@/core/draftActions';
import * as notes from '@/core/noteActions';
import * as parties from '@/core/partyActions';
import * as rules from '@/core/pricingRuleActions';
import * as products from '@/core/productActions';
import * as receipts from '@/core/receiptActions';
import { emptyData, normalize } from '@/core/normalize';
import type { AppData, SyncStatus, UserProfile } from '@/core/types';
import { getSupabase } from './client';
import { clearUserCache, readBook, writeBook } from './cache';
import { derivedOps } from './derivedOps';
import * as auth from './auth';
import {
  draftToRow,
  noteToRow,
  partyToRow,
  paymentToRow,
  pricingRuleToRow,
  productToRow,
  transactionToRow,
} from './mappers';
import { clearQueue, enqueue, opInsert, opSoftDelete, opUpdate, type NewOp } from './queue';
import { looksOnline, syncOnce } from './sync';
import { StoreContext, type StoreValue } from './useStore';

const SYNC_INTERVAL_MS = 30_000;
const IDLE_STATUS: SyncStatus = { loading: false, pendingCount: 0 };

export function StoreProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [status, setStatus] = useState<SyncStatus>({ loading: true, pendingCount: 0 });

  // syncOnce chạy nền nên cần bản sổ mới nhất mà không kéo theo phụ thuộc.
  const latest = useRef(data);
  latest.current = data;
  const syncing = useRef(false);

  const userId = user?.id ?? null;

  const kickSync = useCallback(() => {
    const supabase = getSupabase();
    if (!supabase || !userId || !looksOnline() || syncing.current) return;

    syncing.current = true;
    void syncOnce(supabase, userId, latest.current)
      .then((outcome) => {
        setData(outcome.data);
        setStatus(outcome.status);
      })
      .finally(() => {
        syncing.current = false;
      });
  }, [userId]);

  /** Hiện ngay → ghi máy → xếp hàng đợi → đẩy nền. Đúng thứ tự đó. */
  const commit = useCallback(
    (next: AppData, ops: NewOp[]) => {
      setData(next);
      if (!userId) return;
      void writeBook(userId, next);
      void Promise.all(ops.map(enqueue)).then(kickSync);
    },
    [userId, kickSync],
  );

  // ─── Phiên đăng nhập ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
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
      setData(emptyData());
      return;
    }
    void readBook(userId).then((cached) => {
      setData(cached ?? emptyData());
      kickSync();
    });
  }, [userId, kickSync]);

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

  const value = useMemo<StoreValue>(() => {
    const uid = userId ?? '';

    return {
      data,
      status,
      user,

      addTransaction: (input) => {
        const result = receipts.addTransaction(data, input);
        const tx = result.transaction;
        commit(result.data, [
          ...derivedOps(data, result.data, uid),
          opInsert('transactions', tx.id, transactionToRow(tx, uid)),
          ...tx.payments.map((p) => opInsert('payments', p.id, paymentToRow(p, tx.id, uid))),
        ]);
        return tx;
      },

      addSupplier: (input) => {
        const result = parties.addSupplier(data, input);
        commit(result.data, derivedOps(data, result.data, uid));
        return result.supplier;
      },

      addBuyer: (input) => {
        const result = parties.addBuyer(data, input);
        commit(result.data, derivedOps(data, result.data, uid));
        return result.buyer;
      },

      updateBuyer: (id, patch) => {
        const next = parties.updateBuyer(data, id, patch);
        const buyer = next.buyers.find((b) => b.id === id);
        commit(next, buyer ? [opUpdate('buyers', id, partyToRow(buyer, uid))] : []);
      },

      deleteBuyer: (buyerId) => {
        commit(parties.deleteBuyer(data, buyerId), [opSoftDelete('buyers', buyerId)]);
      },

      addProduct: (input) => {
        const result = products.addProduct(data, input);
        commit(result.data, [
          opInsert('products', result.product.id, productToRow(result.product, uid)),
        ]);
        return result.product;
      },

      updateProduct: (id, patch) => {
        const next = products.updateProduct(data, id, patch);
        const product = next.products.find((p) => p.id === id);
        commit(next, product ? [opUpdate('products', id, productToRow(product, uid))] : []);
      },

      upsertDraft: (draft) => {
        const result = drafts.upsertDraft(data, draft);
        const existed = data.drafts.some((d) => d.id === result.draft.id);
        const row = draftToRow(result.draft, uid);
        commit(result.data, [
          existed
            ? opUpdate('drafts', result.draft.id, row)
            : opInsert('drafts', result.draft.id, row),
        ]);
        return result.draft;
      },

      deleteDraft: (draftId) => {
        commit(drafts.deleteDraft(data, draftId), [opSoftDelete('drafts', draftId)]);
      },

      completeDraft: (draftId) => {
        const result = drafts.completeDraft(data, draftId);
        const tx = result.transaction;
        if (!tx) return null;
        commit(result.data, [
          ...derivedOps(data, result.data, uid),
          opInsert('transactions', tx.id, transactionToRow(tx, uid)),
          ...tx.payments.map((p) => opInsert('payments', p.id, paymentToRow(p, tx.id, uid))),
          opSoftDelete('drafts', draftId),
        ]);
        return tx;
      },

      recordPayment: (txId, amount) => {
        const result = receipts.recordPayment(data, txId, amount);
        if (!result.payment) return;
        commit(result.data, [
          opInsert('payments', result.payment.id, paymentToRow(result.payment, txId, uid)),
        ]);
      },

      updateTransactionAttachments: (txId, attachmentIds) => {
        const next = receipts.updateTransactionAttachments(data, txId, attachmentIds);
        const tx = next.transactions.find((t) => t.id === txId);
        commit(next, tx ? [opUpdate('transactions', txId, transactionToRow(tx, uid))] : []);
      },

      deleteTransaction: (txId) => {
        commit(receipts.deleteTransaction(data, txId), [opSoftDelete('transactions', txId)]);
      },

      addNote: (body) => {
        const result = notes.addNote(data, body);
        if (!result.note) return;
        commit(result.data, [opInsert('notes', result.note.id, noteToRow(result.note, uid))]);
      },

      updateNote: (id, patch) => {
        const next = notes.updateNote(data, id, patch);
        const note = next.notes.find((n) => n.id === id);
        commit(next, note ? [opUpdate('notes', id, noteToRow(note, uid))] : []);
      },

      deleteNote: (id) => {
        commit(notes.deleteNote(data, id), [opSoftDelete('notes', id)]);
      },

      addPricingRule: (input) => {
        const result = rules.addPricingRule(data, input);
        commit(result.data, [
          opInsert('pricing_rules', result.rule.id, pricingRuleToRow(result.rule, uid)),
        ]);
        return result.rule;
      },

      updatePricingRule: (id, patch) => {
        const next = rules.updatePricingRule(data, id, patch);
        const rule = next.pricingRules?.find((r) => r.id === id);
        commit(next, rule ? [opUpdate('pricing_rules', id, pricingRuleToRow(rule, uid))] : []);
      },

      deletePricingRule: (ruleId) => {
        commit(rules.deletePricingRule(data, ruleId), [opSoftDelete('pricing_rules', ruleId)]);
      },

      // Cài đặt là lựa chọn hiển thị của từng máy, không đẩy lên máy chủ.
      updateSettings: (settings) => commit(notes.updateSettings(data, settings), []),

      reset: () => {
        const empty = emptyData();
        setData(empty);
        if (userId) void writeBook(userId, empty);
      },

      importData: (payload) => {
        const restored = normalize(payload);
        setData(restored);
        if (!userId) return;
        void writeBook(userId, restored);
      },

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
        setData(emptyData());
      },

      syncNow: kickSync,
    };
  }, [data, status, user, userId, commit, kickSync]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
