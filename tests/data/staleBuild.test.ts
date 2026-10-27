import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadForStaleBuild } from '@/data/staleBuild';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

const preloadError = () => new Event('vite:preloadError', { cancelable: true });

describe('chunk của bản build cũ không còn trên server', () => {
  it('tải lại trang một lần và chặn lỗi', () => {
    const reload = vi.fn();
    const event = preloadError();
    expect(reloadForStaleBuild(event, reload, 1_000_000)).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('vừa tự tải lại mà vẫn lỗi ⇒ không tải nữa, để lỗi tới ErrorBoundary', () => {
    const reload = vi.fn();
    reloadForStaleBuild(preloadError(), reload, 1_000_000);
    const again = preloadError();
    expect(reloadForStaleBuild(again, reload, 1_005_000)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
    expect(again.defaultPrevented).toBe(false);
  });

  it('lần deploy sau (đã qua lâu) vẫn tự tải lại được', () => {
    const reload = vi.fn();
    reloadForStaleBuild(preloadError(), reload, 1_000_000);
    expect(reloadForStaleBuild(preloadError(), reload, 1_000_000 + 60_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('không ghi được sessionStorage ⇒ không tự tải lại', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    const reload = vi.fn();
    expect(reloadForStaleBuild(preloadError(), reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
