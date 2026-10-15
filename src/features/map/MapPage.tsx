import 'leaflet/dist/leaflet.css';
import { PLACE_KINDS, type Place, type PlaceKind } from '@mambo/contracts';
import type { Map as LeafletMap } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, ZoomControl } from 'react-leaflet';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getPlace } from '@/data/hooks/usePlaces';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { useAccess } from '../shared/useAccess';
import { insideVietnam, type LatLng, VN_CENTER, VN_MAX_BOUNDS, VN_MIN_ZOOM, VN_ZOOM } from './geo';
import { BaseLayers, DraftLayer, MyLocationLayer, PlacesLayer } from './layers';
import { MAP_EDIT_PARAM, MAP_VIEW_PARAM } from './mapLinks';
import { EMPTY_FORM, formFromPlace, PlaceFormSheet, type PlaceFormValues } from './PlaceFormSheet';
import { KIND_BG, KIND_LABEL } from './placeKinds';
import type { PlacesInView } from './usePlacesInView';
import { LOCATION_PROBLEM_TEXT, useMyLocation } from './useMyLocation';

type Mode =
  | { readonly kind: 'browse' }
  /** Chọn vị trí trên bản đồ (thêm mới khi target = null, dời điểm khi có target). */
  | { readonly kind: 'pick'; readonly target: Place | null; readonly draft: LatLng | null }
  | { readonly kind: 'form'; readonly target: Place | null; readonly draft: LatLng };

const NEAR_ZOOM = 15;
const FIRST_FIX_ZOOM = 13;

/** Lớp phủ trên bản đồ phải nằm trên pane của Leaflet (z-index tới 1000). */
const OVERLAY = 'pointer-events-auto z-[1000]';

const ICON_BUTTON = `${OVERLAY} flex size-11 items-center justify-center rounded-full border border-rule bg-card shadow-md`;

/**
 * Bản đồ thu mua: mọi người đã đăng nhập xem địa điểm vựa / doanh nghiệp trong khung nhìn; tổ chức
 * có `place:manage` đặt, dời, sửa, gỡ điểm của mình. Mang sang từ LiveMap.
 */
export function MapPage() {
  const { can } = useAccess();
  const { currentOrgId } = useStore();
  const canManage = can('place:manage');
  const toast = useToast();

  const [map, setMap] = useState<LeafletMap | null>(null);
  const [kinds, setKinds] = useState<readonly PlaceKind[]>(PLACE_KINDS);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<PlacesInView | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'browse' });
  const [values, setValues] = useState<PlaceFormValues>(EMPTY_FORM);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  const location = useMyLocation();
  const flewToMe = useRef(false);
  const wantFlyToMe = useRef(false);
  const openedFromLink = useRef(params.has(MAP_VIEW_PARAM) || params.has(MAP_EDIT_PARAM));

  /** Đang bay do app gọi `flyTo` (tới vị trí của tôi, tới một điểm). */
  const flying = useRef(false);
  const fly = useCallback(
    (at: LatLng, zoom: number) => {
      if (!map) return;
      flying.current = true;
      map.once('moveend', () => {
        flying.current = false;
      });
      map.flyTo([at.lat, at.lng], zoom);
    },
    [map],
  );

  /**
   * Bấm ghim lúc bản đồ còn đang bay (hay gặp nhất: vừa mở màn, đang bay tới vị trí của tôi). Popup
   * chỉ tự canh vào khung một lần lúc mở, flyTo chạy tiếp kéo nó trôi khỏi màn hình tới khi bay xong.
   * Dừng tại chỗ (không animation) rồi báo ghim canh lại popup.
   */
  const stopFlight = useCallback((): boolean => {
    if (!map || !flying.current) return false;
    flying.current = false;
    map.setView(map.getCenter(), Math.round(map.getZoom()), { animate: false });
    return true;
  }, [map]);

  // Lần đầu có vị trí: bay tới quanh mình (nếu đang ở Việt Nam và không mở bằng link tới một điểm).
  useEffect(() => {
    const pos = location.position;
    if (!map || !pos) return;
    if (wantFlyToMe.current) {
      wantFlyToMe.current = false;
      fly(pos, Math.max(map.getZoom(), NEAR_ZOOM));
    } else if (!flewToMe.current && insideVietnam(pos) && !openedFromLink.current) {
      fly(pos, FIRST_FIX_ZOOM);
    }
    flewToMe.current = true;
  }, [map, location.position, fly]);

  // Mở từ trang "Địa điểm của tôi".
  useEffect(() => {
    if (!map) return;
    const id = params.get(MAP_EDIT_PARAM) ?? params.get(MAP_VIEW_PARAM);
    if (!id) return;
    const editing = params.has(MAP_EDIT_PARAM);
    setParams({}, { replace: true });
    getPlace(id)
      .then((place) => {
        fly(place, Math.max(map.getZoom(), NEAR_ZOOM));
        if (editing && canManage && place.organizationId === currentOrgId) {
          setValues(formFromPlace(place));
          setMode({ kind: 'form', target: place, draft: place });
        } else {
          setFocusId(place.id);
        }
      })
      .catch(() => toast({ message: L.mapNotFound, tone: 'alert' }));
  }, [map, params, setParams, canManage, currentOrgId, toast, fly]);

  const goToMe = () => {
    const pos = location.position;
    if (pos && map) {
      fly(pos, Math.max(map.getZoom(), NEAR_ZOOM));
    } else {
      wantFlyToMe.current = true;
      location.start();
    }
  };

  const toggleKind = (kind: PlaceKind) =>
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : PLACE_KINDS.filter((k) => k === kind || prev.includes(k))));

  const startAdd = () => {
    setValues(EMPTY_FORM);
    setFocusId(null);
    map?.closePopup();
    setMode({ kind: 'pick', target: null, draft: null });
  };

  const startEdit = useCallback(
    (place: Place) => {
      map?.closePopup();
      setValues(formFromPlace(place));
      setMode({ kind: 'form', target: place, draft: place });
    },
    [map],
  );

  const pickMyPosition = () => {
    const pos = location.position;
    if (!pos || mode.kind !== 'pick') return;
    if (map) fly(pos, Math.max(map.getZoom(), NEAR_ZOOM));
    setMode({ ...mode, draft: { lat: pos.lat, lng: pos.lng } });
  };

  const finish = (message: string) => {
    setMode({ kind: 'browse' });
    setValues(EMPTY_FORM);
    setVersion((v) => v + 1);
    toast({ message });
  };

  const onStatus = useCallback((s: PlacesInView) => setStatus(s), []);
  const onFocused = useCallback(() => setFocusId(null), []);

  const picking = mode.kind === 'pick';
  const draftOutside = picking && mode.draft !== null && !insideVietnam(mode.draft);
  const editingId = mode.kind !== 'browse' ? (mode.target?.id ?? null) : null;

  const notices = [
    location.problem ? LOCATION_PROBLEM_TEXT[location.problem] : null,
    status?.error ?? null,
    status?.truncated ? L.mapTruncated : null,
  ].filter((n): n is string => n !== null);

  return (
    <div role="region" aria-label={L.mapAria} className={`map-page relative isolate ${picking ? 'map-picking' : ''}`}>
      <MapContainer
        ref={setMap}
        center={VN_CENTER}
        zoom={VN_ZOOM}
        minZoom={VN_MIN_ZOOM}
        maxBounds={VN_MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        className="absolute inset-0"
      >
        <BaseLayers />
        <ZoomControl position="bottomright" />
        <PlacesLayer
          kinds={kinds}
          version={version}
          me={location.position}
          myOrgId={currentOrgId}
          canManage={canManage}
          hiddenId={editingId}
          focusId={focusId}
          onFocused={onFocused}
          onEdit={startEdit}
          onMarkerClick={stopFlight}
          onStatus={onStatus}
        />
        <MyLocationLayer position={location.position} />
        {mode.kind === 'pick' ? <DraftLayer draft={mode.draft} onPick={(at) => setMode({ ...mode, draft: at })} /> : null}
        {mode.kind === 'form' ? <DraftLayer draft={mode.draft} /> : null}
      </MapContainer>

      {/* Bộ lọc + trạng thái tải */}
      {picking ? null : (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-3">
          {PLACE_KINDS.map((kind) => {
            const on = kinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={on}
                onClick={() => toggleKind(kind)}
                className={`${OVERLAY} inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold shadow-sm ${
                  on ? 'border-rule bg-card text-ink' : 'border-rule bg-card/80 text-ink-3 line-through'
                }`}
              >
                <span className={`size-3 rounded-full ${KIND_BG[kind]} ${on ? '' : 'opacity-35'}`} aria-hidden="true" />
                {KIND_LABEL[kind]}
              </button>
            );
          })}
          <span className={`${OVERLAY} rounded-full bg-card/90 px-3 py-1.5 text-sm text-ink-2 shadow-sm`} aria-live="polite">
            {status?.loading ? L.mapLoading : `${status?.places.length ?? 0} ${L.mapInView}`}
          </span>
        </div>
      )}

      {/* Chế độ chọn vị trí */}
      {mode.kind === 'pick' ? (
        <div className={`${OVERLAY} card absolute inset-x-3 top-3 mx-auto flex max-w-lg flex-col gap-3 p-3 shadow-lg`}>
          <p className="font-semibold text-ink">{mode.draft ? L.mapPickDrag : L.mapPickHint}</p>
          {draftOutside ? <p className="text-sm font-medium text-alert">{L.mapPickOutside}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-10 px-3 text-sm" onClick={pickMyPosition} disabled={!location.position}>
              {L.mapUseMyPosition}
            </Button>
            <span className="flex-1" />
            <Button
              className="min-h-10 px-3 text-sm"
              onClick={() => setMode(mode.target ? { kind: 'form', target: mode.target, draft: mode.target } : { kind: 'browse' })}
            >
              {L.cancel}
            </Button>
            <Button
              tone="primary"
              className="min-h-10 px-3 text-sm"
              disabled={!mode.draft || draftOutside}
              onClick={() => mode.draft && setMode({ kind: 'form', target: mode.target, draft: mode.draft })}
            >
              {L.mapContinue}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Thông báo + nút thêm phía dưới — chừa cột phải cho nút phóng to và "Vị trí của tôi". */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-3 pr-16">
        {notices.map((n) => (
          <p key={n} className={`${OVERLAY} card max-w-md px-3 py-2 text-sm text-ink-2 shadow`}>
            {n}
          </p>
        ))}
        {canManage && mode.kind === 'browse' ? (
          <Button tone="primary" className={`${OVERLAY} shadow-lg`} onClick={startAdd}>
            {L.mapAdd}
          </Button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={goToMe}
        aria-label={L.mapMe}
        title={L.mapMe}
        className={`${ICON_BUTTON} absolute bottom-[96px] right-[10px] ${location.position ? 'text-me' : 'text-ink-3'}`}
      >
        {location.locating ? (
          <span className="size-4 animate-spin rounded-full border-2 border-rule border-t-me" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="7" />
          </svg>
        )}
      </button>

      {mode.kind === 'form' ? (
        <PlaceFormSheet
          key={mode.target?.id ?? 'new'}
          target={mode.target}
          position={mode.draft}
          values={values}
          onChange={setValues}
          onRepick={() => setMode({ kind: 'pick', target: mode.target, draft: mode.draft })}
          onSaved={(place) => {
            finish(mode.target ? L.placeSaved : L.placeAdded);
            setFocusId(place.id);
          }}
          onRemoved={() => finish(L.placeRemoved)}
          onClose={() => {
            setMode({ kind: 'browse' });
            setValues(EMPTY_FORM);
          }}
        />
      ) : null}
    </div>
  );
}
