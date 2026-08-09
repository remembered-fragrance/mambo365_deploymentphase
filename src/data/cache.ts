/**
 * Bản sao cục bộ của sổ.
 *
 * Mở app là đọc từ đây và hiện ngay — không bao giờ để màn trắng chờ mạng.
 * Cache tách theo `userId`: hai người cùng dùng một máy không thấy sổ của nhau.
 */

import type { AppData } from '@/core/types';
import { normalize } from '@/core/normalize';
import { openLocalDb } from './localDb';

export const readBook = async (userId: string): Promise<AppData | null> => {
  const db = await openLocalDb();
  const raw = await db.get('books', userId);
  return raw ? normalize(raw) : null;
};

export const writeBook = async (userId: string, data: AppData): Promise<void> => {
  const db = await openLocalDb();
  await db.put('books', data, userId);
};

/** Đăng xuất hoặc đổi tài khoản: xoá sạch dấu vết của tài khoản cũ. */
export const clearUserCache = async (userId: string): Promise<void> => {
  const db = await openLocalDb();
  await Promise.all([db.delete('books', userId), db.delete('syncMarks', userId)]);
};

export const readSyncMark = async (userId: string): Promise<string | null> => {
  const db = await openLocalDb();
  return (await db.get('syncMarks', userId)) ?? null;
};

export const writeSyncMark = async (userId: string, isoTime: string): Promise<void> => {
  const db = await openLocalDb();
  await db.put('syncMarks', isoTime, userId);
};
