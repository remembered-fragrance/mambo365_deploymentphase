/**
 * Nhắc bổ sung email, bảy ngày một lần.
 *
 * Không có email thì mất mật khẩu là phải nhờ người khác đặt lại tay — nhắc là
 * đúng. Nhưng nhắc mỗi lần mở app thì người ta học cách phớt lờ, nên có "Để
 * sau" và bảy ngày sau mới hỏi lại.
 *
 * Mốc "để sau" nằm ở localStorage vì nó là chuyện của MÁY này, không phải của
 * sổ: đồng bộ nó lên máy chủ chẳng để làm gì.
 */

import { useCallback, useState } from 'react';
import { EMAIL_REMINDER_DAYS } from '@/config';

const KEY = 'thumua365:email-reminder';
const DAY_MS = 86_400_000;

const snoozedUntil = (): number => {
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface EmailReminder {
  readonly show: boolean;
  readonly snooze: () => void;
}

export function useEmailReminder(hasEmail: boolean): EmailReminder {
  const [until, setUntil] = useState(snoozedUntil);

  const snooze = useCallback(() => {
    const next = new Date(Date.now() + EMAIL_REMINDER_DAYS * DAY_MS);
    localStorage.setItem(KEY, next.toISOString());
    setUntil(next.getTime());
  }, []);

  return { show: !hasEmail && Date.now() >= until, snooze };
}
