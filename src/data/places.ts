/**
 * Bản đồ thu mua (Thumua365_BE docs/FRONTEND.md §5.13, API v0.14.0). Cần mạng — không giữ bản
 * trong máy: địa điểm là của tổ chức khác, đọc theo khung nhìn.
 *
 * Vị trí của người dùng KHÔNG đi qua đây: "Vị trí của tôi" chỉ dùng trong trình duyệt.
 */

import type { Place, PlaceInput, PlacePatch, PlacesList } from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { L } from '@/i18n/labels';
import { api } from './client';

/** `bbox` = `minLng,minLat,maxLng,maxLat`; `kinds` = `trader,enterprise` (bỏ trống = cả hai). */
export const placesInView = (bbox: string, kinds: string, signal?: AbortSignal): Promise<PlacesList> =>
  api.places.inView({ bbox, kinds }, signal);

export const getPlace = (id: string): Promise<Place> => api.places.get(id);
export const listMyPlaces = (): Promise<PlacesList> => api.places.mine();
export const createPlace = (input: PlaceInput): Promise<Place> => api.places.create(input);
export const updatePlace = (id: string, patch: PlacePatch): Promise<Place> => api.places.update(id, patch);
export const removePlace = async (id: string): Promise<void> => {
  await api.places.remove(id);
};

/** Lời gọi bị huỷ (kéo bản đồ tiếp) — không phải lỗi để báo. */
export const isAbort = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError';

/** Lỗi từng ô máy chủ trả về (`details.fields`) — `lng` gộp vào `lat` (một dòng "Vị trí"). */
export const placeFieldErrors = (err: unknown): Readonly<Record<string, string>> => {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_FAILED') return {};
  const fields = (err.details?.fields as Record<string, unknown> | undefined) ?? {};
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(fields)) {
    if (typeof message === 'string') out[key === 'lng' ? 'lat' : key] ??= message;
  }
  return out;
};

/** Câu lỗi tiếng Việt cho các thao tác địa điểm. Rẽ theo `details.reason`, rồi theo `code`. */
export const placeErrorMessage = (err: unknown): string => {
  if (err instanceof TypeError) return L.placeOffline;
  if (!(err instanceof ApiError)) return L.placeFailed;
  if (err.details?.reason === 'PLACE_LIMIT') {
    return `${L.placeLimit} ${String(err.details.limit ?? '')} ${L.placeLimitUnit}`.replace(/\s+/g, ' ');
  }
  switch (err.code) {
    case 'NOT_FOUND':
      return L.placeNotFound;
    case 'FORBIDDEN':
    case 'NOT_A_MEMBER':
      return L.placeForbidden;
    case 'RATE_LIMITED':
      return L.placeRateLimited;
    case 'VALIDATION_FAILED': {
      // `fields` = { tên trường: câu lỗi } — câu để hiện cho người dùng.
      const first = Object.values((err.details?.fields as Record<string, unknown> | undefined) ?? {})[0];
      return typeof first === 'string' ? first : L.placeFailed;
    }
    default:
      return err.requestId ? `${L.placeFailed} (id: ${err.requestId})` : L.placeFailed;
  }
};
