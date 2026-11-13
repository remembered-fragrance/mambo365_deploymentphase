import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', { location: { origin: 'https://www.thumua365.id.vn' } });
const { linkUrl, qrImage } = await import('@/features/partners/linkQr');

describe('QR mã kết nối', () => {
  it('link mở thẳng ô nhập mã, đúng mã', () => {
    expect(linkUrl('K7M2QX9P')).toBe('https://www.thumua365.id.vn/ket-noi?ma=K7M2QX9P');
  });

  it('ảnh QR vẽ ngay trong máy (data URL), không gọi dịch vụ ngoài', async () => {
    const src = await qrImage(linkUrl('K7M2QX9P'));
    expect(src.startsWith('data:image/svg+xml')).toBe(true);
    expect(decodeURIComponent(src)).toContain('fill="white"'); // nền trắng: quét được cả khi app ở giao diện tối
  });
});
