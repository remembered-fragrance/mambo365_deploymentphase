/**
 * Bản sao cục bộ của sổ.
 *
 * Mở app là đọc từ đây và hiện ngay — không bao giờ để màn trắng chờ mạng.
 * Cache tách theo `orgId` (hoặc `userId` khi chạy tài khoản máy): hai tổ chức không lẫn sổ của nhau.
 */

import type { AppData } from '@/core/types';
import { normalize } from '@/core/normalize';
import { clearCursor, openLocalDb } from './localDb';

export const readBook = async (key: string): Promise<AppData | null> => {
  const db = await openLocalDb();
  const raw = await db.get('books', key);
  return raw ? normalize(raw) : null;
};

export const writeBook = async (key: string, data: AppData): Promise<void> => {
  const db = await openLocalDb();
  await db.put('books', data, key);
};

/** Đăng xuất hoặc đổi tài khoản: xoá sạch dấu vết của tài khoản cũ. */
export const clearUserCache = async (key: string): Promise<void> => {
  const db = await openLocalDb();
  await Promise.all([
    db.delete('books', key),
    db.delete('syncMarks', key),
    clearCursor(key),
  ]);
};

export const clearOrgCache = clearUserCache;

export const readSyncMark = async (key: string): Promise<string | null> => {
  const db = await openLocalDb();
  return (await db.get('syncMarks', key)) ?? null;
};

export const writeSyncMark = async (key: string, isoTime: string): Promise<void> => {
  const db = await openLocalDb();
  await db.put('syncMarks', isoTime, key);
};
