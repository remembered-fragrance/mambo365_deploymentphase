/**
 * Toast báo đồng bộ có thể dài ba câu — 8 giây không đủ để người cân đọc hết. Toast có "Hoàn tác" thì giữ
 * đúng khoảng được hoàn tác.
 */

import { describe, expect, it } from 'vitest';
import { toastDuration } from '@/components/ui/toastDuration';
import { UNDO_MS } from '@/config';

describe('toastDuration', () => {
  it('câu ngắn giữ như cũ', () => {
    expect(toastDuration({ message: 'Đã lưu' })).toBe(UNDO_MS);
  });

  it('câu dài giữ lâu hơn, có trần', () => {
    const long = toastDuration({ message: 'x'.repeat(300) });
    expect(long).toBeGreaterThan(UNDO_MS);
    expect(toastDuration({ message: 'x'.repeat(5_000) })).toBe(20_000);
  });

  it('có "Hoàn tác" thì giữ đúng khoảng hoàn tác', () => {
    expect(toastDuration({ message: 'x'.repeat(300), onUndo: () => undefined })).toBe(UNDO_MS);
  });
});
