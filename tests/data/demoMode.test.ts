import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetDemo, isDemoActive, setDemoActive } from '@/data/demoMode';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

describe('cờ dữ liệu mẫu gắn với một sổ', () => {
  it('bật mẫu ở tổ chức B không làm tổ chức A thành sổ mẫu', () => {
    setDemoActive('org-b', true);
    expect(isDemoActive('org-b')).toBe(true);
    expect(isDemoActive('org-a')).toBe(false);
  });

  it('tắt ở sổ khác không gỡ cờ của sổ đang xem mẫu', () => {
    setDemoActive('org-b', true);
    setDemoActive('org-a', false);
    expect(isDemoActive('org-b')).toBe(true);
  });

  it('cờ của bản cũ ("1") vẫn được coi là đang xem mẫu — không để dữ liệu mẫu mất banner', () => {
    localStorage.setItem('thumua365:demo', '1');
    expect(isDemoActive('org-a')).toBe(true);
    forgetDemo(['org-a']);
    expect(isDemoActive('org-a')).toBe(false);
  });

  it('dọn sổ của người này thì cờ đi theo, cờ sổ của người khác thì giữ', () => {
    setDemoActive('org-khac', true);
    forgetDemo(['org-a']);
    expect(isDemoActive('org-khac')).toBe(true);
    forgetDemo(['org-khac']);
    expect(isDemoActive('org-khac')).toBe(false);
  });
});
