/**
 * Icon tự vẽ bằng SVG trong divIcon — không dùng icon PNG mặc định của Leaflet (đường dẫn ảnh hỏng
 * khi đóng gói bằng Vite). Màu đi qua class (`map-pin--trader`…) → token trong src/index.css, nên
 * đổi chế độ Ngoài nắng / Ban đêm là ghim đổi theo.
 */

import type { PlaceKind } from '@mambo/contracts';
import { divIcon, type DivIcon } from 'leaflet';

/** Ký hiệu trong ghim: cái giỏ (vựa) / toà nhà (doanh nghiệp). */
const GLYPH: Readonly<Record<PlaceKind, string>> = {
  trader:
    '<path class="map-pin__glyph" d="M10 15h12l-1.3 6.2a1 1 0 0 1-1 .8h-7.4a1 1 0 0 1-1-.8zM12.5 15l2-4M19.5 15l-2-4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  enterprise:
    '<path class="map-pin__glyph" d="M11 22V12l5-2.5V22M16 13.5l5 2V22M9.5 22h13" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
};

const DRAFT_GLYPH = '<circle class="map-pin__dot" cx="16" cy="15" r="4.5"/>';

const pinSvg = (tone: string, glyph: string, size: number): string =>
  `<svg class="map-pin map-pin--${tone}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.25)}" viewBox="0 0 32 40" aria-hidden="true">` +
  '<path class="map-pin__outline" d="M16 1C8.3 1 2 7.1 2 14.7 2 25 16 39 16 39s14-14 14-24.3C30 7.1 23.7 1 16 1z" fill="currentColor" stroke-width="2"/>' +
  `${glyph}</svg>`;

const cache = new Map<string, DivIcon>();

const pin = (tone: string, glyph: string, size: number): DivIcon => {
  const key = `${tone}:${size}`;
  let icon = cache.get(key);
  if (!icon) {
    const h = Math.round(size * 1.25);
    icon = divIcon({
      className: 'map-icon',
      html: pinSvg(tone, glyph, size),
      iconSize: [size, h],
      iconAnchor: [size / 2, h],
      popupAnchor: [0, -h + 4],
    });
    cache.set(key, icon);
  }
  return icon;
};

/** Ghim của tổ chức mình to hơn một chút — dễ tìm điểm của mình giữa các điểm khác. */
export const placeIcon = (kind: PlaceKind, mine: boolean): DivIcon => pin(kind, GLYPH[kind], mine ? 38 : 32);

/** Ghim đang chọn khi thêm / dời địa điểm. */
export const draftIcon = (): DivIcon => pin('draft', DRAFT_GLYPH, 40);

export const meIcon = (): DivIcon =>
  divIcon({ className: 'map-icon', html: '<div class="map-me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c);

export const sovereigntyIcon = (text: string): DivIcon =>
  divIcon({ className: 'map-icon', html: `<div class="map-sovereignty">${escapeHtml(text)}</div>`, iconSize: [0, 0] });
