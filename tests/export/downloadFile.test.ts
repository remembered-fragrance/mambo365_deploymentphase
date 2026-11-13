/**
 * "Gửi Zalo" trên máy không có bảng chia sẻ (máy tính) từng âm thầm chép vào clipboard — bấm như không có gì xảy ra.
 * Màn hình chỉ báo được khi biết kết quả là `copied`; người dùng tự đóng bảng chia sẻ thì không phải lỗi.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareText } from '@/export/downloadFile';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shareText', () => {
  it('🔴 không có bảng chia sẻ ⇒ chép vào clipboard và trả `copied`', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(shareText('Phiếu', 'Phiếu thu mua')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Phiếu');
  });

  it('có bảng chia sẻ ⇒ `shared`', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockResolvedValue(undefined) });
    await expect(shareText('Phiếu', 'Phiếu thu mua')).resolves.toBe('shared');
  });

  it('🔴 người dùng đóng bảng chia sẻ ⇒ `cancelled`, không ném lỗi', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')) });
    await expect(shareText('Phiếu', 'Phiếu thu mua')).resolves.toBe('cancelled');
  });

  it('lỗi thật vẫn ném ra để màn hình báo', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('x', 'NotAllowedError')) });
    await expect(shareText('Phiếu', 'Phiếu thu mua')).rejects.toThrow();
  });
});
