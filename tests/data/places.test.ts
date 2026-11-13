import { PLACES_PER_ORG_LIMIT } from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { describe, expect, it } from 'vitest';
import { isAbort, placeErrorMessage, placeFieldErrors } from '@/data/places';
import { validatePlace } from '@/features/map/PlaceFormSheet';
import { L } from '@/i18n/labels';

const v = (details: Record<string, unknown>) => new ApiError('VALIDATION_FAILED', 422, 'x', undefined, details);

describe('placeErrorMessage', () => {
  it('vượt giới hạn mỗi tổ chức: nói số', () => {
    const msg = placeErrorMessage(v({ reason: 'PLACE_LIMIT', limit: PLACES_PER_ORG_LIMIT }));
    expect(msg).toBe(`${L.placeLimit} ${PLACES_PER_ORG_LIMIT} ${L.placeLimitUnit}`);
  });

  it('theo mã lỗi; mất mạng; lỗi lạ kèm mã yêu cầu', () => {
    expect(placeErrorMessage(new ApiError('NOT_FOUND', 404, 'x'))).toBe(L.placeNotFound);
    expect(placeErrorMessage(new ApiError('FORBIDDEN', 403, 'x'))).toBe(L.placeForbidden);
    expect(placeErrorMessage(new ApiError('RATE_LIMITED', 429, 'x'))).toBe(L.placeRateLimited);
    expect(placeErrorMessage(new TypeError('Failed to fetch'))).toBe(L.placeOffline);
    expect(placeErrorMessage(new ApiError('INTERNAL', 500, 'x', 'req-1'))).toBe(`${L.placeFailed} (id: req-1)`);
  });

  it('lỗi ô nhập: hiện câu máy chủ gắn cho ô', () => {
    expect(placeErrorMessage(v({ fields: { lat: 'Vị trí nằm ngoài Việt Nam' } }))).toBe('Vị trí nằm ngoài Việt Nam');
  });
});

describe('placeFieldErrors', () => {
  it('lng gộp vào lat (một dòng Vị trí); lỗi không phải 422 → rỗng', () => {
    expect(placeFieldErrors(v({ fields: { name: 'Nhập tên địa điểm', lng: 'Vị trí nằm ngoài Việt Nam' } }))).toEqual({
      name: 'Nhập tên địa điểm',
      lat: 'Vị trí nằm ngoài Việt Nam',
    });
    expect(placeFieldErrors(new ApiError('NOT_FOUND', 404, 'x'))).toEqual({});
  });
});

describe('validatePlace — kiểm ở máy bằng cùng schema với máy chủ', () => {
  const ok = { name: 'Vựa Tư Hùng', address: '', phone: '', description: '' };
  it('hợp lệ → không lỗi', () => {
    expect(validatePlace(ok, { lat: 11.83, lng: 106.59 })).toEqual({});
  });
  it('thiếu tên, ngoài Việt Nam', () => {
    const errors = validatePlace({ ...ok, name: '   ' }, { lat: 1.35, lng: 103.82 });
    expect(Object.keys(errors).sort()).toEqual(['lat', 'name']);
  });
});

describe('isAbort', () => {
  it('chỉ AbortError', () => {
    expect(isAbort(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbort(new TypeError('x'))).toBe(false);
  });
});
