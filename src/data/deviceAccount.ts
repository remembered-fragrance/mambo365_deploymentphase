/**
 * Tài khoản cục bộ của máy này.
 *
 * Dùng khi chưa cấu hình máy chủ: app vẫn phải ghi được sổ và giữ được dữ liệu
 * giữa các lần mở. Đây không phải chế độ demo — dữ liệu là thật, chỉ chưa đồng
 * bộ đi đâu. Khi có tài khoản Supabase, sổ này nhập lại được bằng "Lấy lại từ file".
 */

import { newId } from '@/core/id';
import type { UserProfile } from '@/core/types';

const DEVICE_KEY = 'thumua365:device-account';

export const deviceAccount = (): UserProfile => {
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as UserProfile;
    } catch {
      // Hỏng thì dựng lại — sổ trong IndexedDB tra theo id nên id mới là sổ mới,
      // vì vậy chỉ dựng lại khi thực sự không đọc nổi.
    }
  }

  const profile: UserProfile = {
    id: newId(),
    identifier: 'may-nay',
    name: 'Chủ vựa',
  };
  localStorage.setItem(DEVICE_KEY, JSON.stringify(profile));
  return profile;
};
