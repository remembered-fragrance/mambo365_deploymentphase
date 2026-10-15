import { formatPhoneVn, normalizePhone } from '@mambo/core/identifier';
import type { Place, PlaceKind } from '@mambo/contracts';
import type { Marker as LeafletMarker } from 'leaflet';
import { type ReactNode, useEffect, useRef } from 'react';
import { Circle, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { L } from '@/i18n/labels';
import { directionsUrl, distanceMeters, formatDistance, type LatLng, SOVEREIGNTY_LABELS, telHref } from './geo';
import { draftIcon, meIcon, placeIcon, sovereigntyIcon } from './markerIcon';
import { KIND_BG, KIND_LABEL } from './placeKinds';
import { type PlacesInView, usePlacesInView } from './usePlacesInView';
import type { MyPosition } from './useMyLocation';

/**
 * Nền mặc định: tile của OpenStreetMap (miễn phí, cần ghi nguồn, không dùng cho lưu lượng lớn —
 * https://operations.osmfoundation.org/policies/tiles/). Lên lưu lượng thật thì đặt
 * `VITE_TILE_URL` / `VITE_TILE_ATTRIBUTION` sang nhà cung cấp trả phí.
 */
const TILE_URL: string = import.meta.env.VITE_TILE_URL?.trim() || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION: string =
  import.meta.env.VITE_TILE_ATTRIBUTION?.trim() ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/**
 * Lớp nền + nhãn chủ quyền Hoàng Sa, Trường Sa.
 *
 * `referrerPolicy`: Vercel gửi `Referrer-Policy: no-referrer` cho cả trang, mà máy chủ tile của OSM
 * chặn yêu cầu không có Referer. Chỉ ảnh tile gửi origin của app (không gửi đường dẫn).
 */
export const BaseLayers = () => (
  <>
    <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} referrerPolicy="strict-origin-when-cross-origin" />
    {SOVEREIGNTY_LABELS.map((label) => (
      <Marker key={label.text} position={label.at} icon={sovereigntyIcon(label.text)} interactive={false} keyboard={false} />
    ))}
  </>
);

export const MyLocationLayer = ({ position }: { readonly position: MyPosition | null }) => {
  if (!position) return null;
  const center: [number, number] = [position.lat, position.lng];
  return (
    <>
      {/* Vòng sai số: trên 3 km thì vẽ chỉ làm rối — chấm xanh đủ biết. */}
      {position.accuracy <= 3000 ? (
        <Circle center={center} radius={position.accuracy} interactive={false} pathOptions={{ className: 'map-accuracy', weight: 1 }} />
      ) : null}
      <Marker position={center} icon={meIcon()} zIndexOffset={1000} keyboard={false}>
        <Popup>
          <p className="font-semibold">{L.mapMe}</p>
          <p className="text-ink-3">
            {L.mapMeAccuracy} {formatDistance(position.accuracy)}
          </p>
        </Popup>
      </Marker>
    </>
  );
};

const PhoneLine = ({ phone }: { readonly phone: string }) => {
  const e164 = normalizePhone(phone);
  return (
    <p>
      {L.mapCall}:{' '}
      <a href={e164 ? `tel:${e164}` : telHref(phone)} className="font-semibold text-brand!">
        {e164 ? formatPhoneVn(e164) : phone}
      </a>
    </p>
  );
};

const PlacePopup = ({
  place,
  me,
  canEdit,
  onEdit,
}: {
  readonly place: Place;
  readonly me: MyPosition | null;
  readonly canEdit: boolean;
  readonly onEdit: (place: Place) => void;
}) => (
  <div className="flex min-w-52 max-w-64 flex-col gap-1.5">
    <span className={`self-start rounded-full px-2 py-0.5 text-xs font-semibold text-card ${KIND_BG[place.kind]}`}>
      {KIND_LABEL[place.kind]}
    </span>
    <p className="text-base font-bold leading-snug text-ink">{place.name}</p>
    <p className="text-ink-2">{place.organizationName}</p>
    {place.address ? <p className="text-ink-2">{place.address}</p> : null}
    {place.phone ? <PhoneLine phone={place.phone} /> : null}
    {place.description ? <p className="whitespace-pre-line text-ink-2">{place.description}</p> : null}
    {me ? (
      <p className="text-ink-3">
        {L.mapDistance} {formatDistance(distanceMeters(me, place))} {L.mapDistanceNote}
      </p>
    ) : null}
    <div className="mt-1 flex flex-wrap gap-2">
      <a
        href={directionsUrl(place, me)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-9 items-center rounded-xl border border-brand bg-brand px-3 text-sm font-semibold text-paper!"
      >
        {L.mapDirections}
      </a>
      {canEdit ? (
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-xl border border-rule bg-card px-3 text-sm font-semibold text-ink"
          onClick={() => onEdit(place)}
        >
          {L.mapEdit}
        </button>
      ) : null}
    </div>
  </div>
);

const PlaceMarker = ({
  place,
  mine,
  focused,
  onFocused,
  children,
}: {
  readonly place: Place;
  readonly mine: boolean;
  readonly focused: boolean;
  readonly onFocused: () => void;
  readonly children: ReactNode;
}) => {
  const ref = useRef<LeafletMarker>(null);
  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.openPopup();
    onFocused();
  }, [focused, onFocused]);
  return (
    <Marker ref={ref} position={[place.lat, place.lng]} icon={placeIcon(place.kind, mine)} title={place.name} alt={place.name}>
      {/* Chừa chỗ cho thanh lọc phía trên và nút nổi bên phải khi bản đồ tự trượt để hiện popup. */}
      <Popup autoPanPaddingTopLeft={[16, 96]} autoPanPaddingBottomRight={[64, 24]}>
        {children}
      </Popup>
    </Marker>
  );
};

/** Ghim các địa điểm trong khung nhìn; báo trạng thái tải ra ngoài qua `onStatus`. */
export const PlacesLayer = ({
  kinds,
  version,
  me,
  myOrgId,
  canManage,
  hiddenId,
  focusId,
  onFocused,
  onEdit,
  onStatus,
}: {
  readonly kinds: readonly PlaceKind[];
  readonly version: number;
  readonly me: MyPosition | null;
  readonly myOrgId: string | null;
  readonly canManage: boolean;
  /** Đang dời điểm này — ẩn ghim cũ, chỉ hiện ghim nháp. */
  readonly hiddenId: string | null;
  /** Mở popup của điểm này một lần (vừa lưu, hoặc mở từ "Địa điểm của tôi"). */
  readonly focusId: string | null;
  readonly onFocused: () => void;
  readonly onEdit: (place: Place) => void;
  readonly onStatus: (status: PlacesInView) => void;
}) => {
  const status = usePlacesInView(kinds, version);
  useEffect(() => onStatus(status), [status, onStatus]);

  return (
    <>
      {status.places
        .filter((p) => p.id !== hiddenId)
        .map((place) => {
          const mine = place.organizationId === myOrgId;
          return (
            <PlaceMarker key={place.id} place={place} mine={mine} focused={place.id === focusId} onFocused={onFocused}>
              <PlacePopup place={place} me={me} canEdit={mine && canManage} onEdit={onEdit} />
            </PlaceMarker>
          );
        })}
    </>
  );
};

/** Chế độ chọn điểm: chạm bản đồ để đặt ghim nháp; ghim kéo được. `onPick` vắng = chỉ hiện ghim. */
export const DraftLayer = ({ draft, onPick }: { readonly draft: LatLng | null; readonly onPick?: (at: LatLng) => void }) => {
  useMapEvents({ click: (e) => onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  if (!draft) return null;
  return (
    <Marker
      position={[draft.lat, draft.lng]}
      icon={draftIcon()}
      draggable={onPick !== undefined}
      zIndexOffset={2000}
      eventHandlers={{
        dragend: (e) => {
          const at = (e.target as LeafletMarker).getLatLng();
          onPick?.({ lat: at.lat, lng: at.lng });
        },
      }}
    />
  );
};
