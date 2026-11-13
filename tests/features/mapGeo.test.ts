import { BBox, VN_BOUNDS } from '@mambo/contracts';
import { describe, expect, it } from 'vitest';
import {
  bboxString,
  directionsUrl,
  distanceMeters,
  formatDistance,
  formatLatLng,
  insideVietnam,
  roundLatLng,
  SOVEREIGNTY_LABELS,
  telHref,
} from '@/features/map/geo';
import { mapEditLink, mapViewLink } from '@/features/map/mapLinks';

describe('khung Việt Nam', () => {
  it('gồm đất liền, Hoàng Sa, Trường Sa; không gồm Singapore, Lào', () => {
    expect(insideVietnam({ lat: 21.03, lng: 105.85 })).toBe(true);
    expect(insideVietnam({ lat: 16.5, lng: 112.0 })).toBe(true);
    expect(insideVietnam({ lat: 8.6, lng: 111.9 })).toBe(true);
    expect(insideVietnam({ lat: 1.35, lng: 103.82 })).toBe(false);
    expect(insideVietnam({ lat: 17.97, lng: 101.5 })).toBe(false);
  });

  it('nhãn chủ quyền nằm trong khung', () => {
    expect(SOVEREIGNTY_LABELS).toHaveLength(2);
    for (const { at } of SOVEREIGNTY_LABELS) expect(insideVietnam({ lat: at[0], lng: at[1] })).toBe(true);
  });

  it('cùng khung với máy chủ', () => {
    expect(VN_BOUNDS).toEqual({ minLat: 7, maxLat: 24, minLng: 102, maxLng: 118 });
  });
});

describe('bboxString — tham số bbox của GET /v1/places', () => {
  it('đúng thứ tự minLng,minLat,maxLng,maxLat, 5 chữ số, máy chủ nhận', () => {
    const s = bboxString(106.4, 11.4, 107, 12);
    expect(s).toBe('106.40000,11.40000,107.00000,12.00000');
    expect(BBox.parse(s)).toEqual({ minLng: 106.4, minLat: 11.4, maxLng: 107, maxLat: 12 });
  });

  it('thu nhỏ hết cỡ (vượt ±180, ±90) → kẹp lại, máy chủ vẫn nhận', () => {
    const s = bboxString(-250.123, -95, 400, 95);
    expect(s).toBe('-180.00000,-90.00000,180.00000,90.00000');
    expect(BBox.safeParse(s).success).toBe(true);
  });

  it('số rất nhỏ không thành ký hiệu mũ', () => {
    expect(bboxString(0.0000001, 0, 1, 1)).not.toMatch(/e/i);
  });
});

describe('khoảng cách và định dạng', () => {
  it('Hà Nội → TP.HCM ≈ 1.140 km theo đường chim bay', () => {
    const km = distanceMeters({ lat: 21.0285, lng: 105.8542 }, { lat: 10.7769, lng: 106.7009 }) / 1000;
    expect(km).toBeGreaterThan(1130);
    expect(km).toBeLessThan(1150);
  });

  it('m dưới 1 km, km một chữ số thập phân dưới 100 km, km tròn từ 100 km', () => {
    expect(formatDistance(3)).toBe('10 m');
    expect(formatDistance(847)).toBe('850 m');
    expect(formatDistance(3240)).toBe('3,2 km');
    expect(formatDistance(120_400)).toBe('120 km');
  });

  it('toạ độ: hiện 5 chữ số, gửi 6 chữ số', () => {
    expect(formatLatLng({ lat: 11.8312345, lng: 106.5912345 })).toBe('11.83123, 106.59123');
    expect(roundLatLng({ lat: 11.83123456, lng: 106.59123456 })).toEqual({ lat: 11.831235, lng: 106.591235 });
  });
});

describe('liên kết ra ngoài', () => {
  it('chỉ đường Google Maps: điểm đến là toạ độ ghim, có vị trí của tôi thì làm điểm xuất phát', () => {
    expect(directionsUrl({ lat: 11.83, lng: 106.59 })).toBe('https://www.google.com/maps/dir/?api=1&destination=11.83,106.59');
    expect(directionsUrl({ lat: 11.83, lng: 106.59 }, { lat: 11.5, lng: 106.6 })).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=11.5,106.6&destination=11.83,106.59',
    );
  });

  it('tel: chỉ giữ chữ số và dấu + ở đầu', () => {
    expect(telHref('0905 112 233')).toBe('tel:0905112233');
    expect(telHref('+84 (905) 112-233')).toBe('tel:+84905112233');
  });

  it('mở bản đồ tới một điểm / mở form sửa', () => {
    expect(mapViewLink('abc')).toBe('/ban-do?xem=abc');
    expect(mapEditLink('abc')).toBe('/ban-do?sua=abc');
  });
});
