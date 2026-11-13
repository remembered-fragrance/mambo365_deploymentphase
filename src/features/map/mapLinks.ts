import { ROUTES } from '../shared/navItems';

/**
 * Mở bản đồ từ "Địa điểm của tôi": `?xem=<id>` bay tới + mở popup, `?sua=<id>` mở form sửa.
 * Để riêng khỏi MapPage — trang danh sách không phải tải Leaflet.
 */
export const MAP_VIEW_PARAM = 'xem';
export const MAP_EDIT_PARAM = 'sua';

export const mapViewLink = (placeId: string): string => `${ROUTES.map}?${MAP_VIEW_PARAM}=${encodeURIComponent(placeId)}`;
export const mapEditLink = (placeId: string): string => `${ROUTES.map}?${MAP_EDIT_PARAM}=${encodeURIComponent(placeId)}`;
