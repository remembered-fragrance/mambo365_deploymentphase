/**
 * Toạ độ, khoảng cách, khung nhìn — thuần, không chạm Leaflet (test chạy trong Node).
 */

import { VN_BOUNDS } from '@mambo/contracts';
import { L } from '@/i18n/labels';

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/** Khung nhìn ban đầu: cả nước, gồm Hoàng Sa và Trường Sa. */
export const VN_CENTER: [number, number] = [16.0, 106.5];
export const VN_ZOOM = 6;
export const VN_MIN_ZOOM = 5;
/** Không cho kéo bản đồ ra quá xa Việt Nam. */
export const VN_MAX_BOUNDS: [[number, number], [number, number]] = [
  [6, 100],
  [24.5, 119],
];

/** Nhãn chủ quyền đặt cố định trên bản đồ. */
export const SOVEREIGNTY_LABELS: readonly { readonly text: string; readonly at: [number, number] }[] = [
  { text: L.mapSovereigntyHoangSa, at: [16.5, 112.0] },
  { text: L.mapSovereigntyTruongSa, at: [10.0, 114.5] },
];

export const insideVietnam = ({ lat, lng }: LatLng): boolean =>
  lat >= VN_BOUNDS.minLat && lat <= VN_BOUNDS.maxLat && lng >= VN_BOUNDS.minLng && lng <= VN_BOUNDS.maxLng;

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Khoảng cách theo đường chim bay (haversine), mét. */
export const distanceMeters = (a: LatLng, b: LatLng): number => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

const km = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** `850 m`, `3,2 km`, `120 km`. */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  if (meters < 100_000) return `${km.format(meters / 1000)} km`;
  return `${Math.round(meters / 1000)} km`;
};

/** Toạ độ hiển thị: 5 chữ số thập phân ≈ 1 m. */
export const formatLatLng = ({ lat, lng }: LatLng): string => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Làm tròn toạ độ gửi lên server — 6 chữ số ≈ 0,1 m, đủ cho một điểm thu mua. */
export const roundLatLng = ({ lat, lng }: LatLng): LatLng => ({
  lat: Math.round(lat * 1e6) / 1e6,
  lng: Math.round(lng * 1e6) / 1e6,
});

/**
 * `minLng,minLat,maxLng,maxLat` cho `GET /v1/places` — 5 chữ số, không ký hiệu mũ (đúng `BBox` của
 * contracts), kẹp vào khoảng toạ độ hợp lệ (bản đồ thu nhỏ hết cỡ có thể vượt ±180).
 */
export const bboxString = (west: number, south: number, east: number, north: number): string => {
  const clamp = (v: number, limit: number) => Math.min(limit, Math.max(-limit, v));
  return [clamp(west, 180), clamp(south, 90), clamp(east, 180), clamp(north, 90)].map((n) => n.toFixed(5)).join(',');
};

const coord = (p: LatLng): string => {
  const r = roundLatLng(p);
  return `${r.lat},${r.lng}`;
};

/**
 * Mở Google Maps chỉ đường (trên điện thoại sẽ mở ứng dụng). Điểm đến là toạ độ ghim nên tuyến kết
 * thúc đúng chỗ. Có `from` (vị trí của tôi) thì gửi kèm làm điểm xuất phát — Google Maps trên web hay
 * đoán vị trí theo IP, lệch cả chục km.
 */
export const directionsUrl = (to: LatLng, from?: LatLng | null): string => {
  const origin = from ? `&origin=${coord(from)}` : '';
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${coord(to)}`;
};

/** `tel:` cho số người dùng tự gõ: chỉ giữ chữ số và dấu + ở đầu. */
export const telHref = (phone: string): string => `tel:${phone.trim().replace(/(?!^\+)[^\d]/g, '')}`;
