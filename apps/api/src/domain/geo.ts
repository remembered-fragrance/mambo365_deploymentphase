/** Khoảng cách đường thẳng (mét). Không dùng làm km vận chuyển. */
export const haversineM = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const r = 6371000;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const assertLngLat = (lng: number, lat: number): void => {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new Error('lng/lat');
  }
};
