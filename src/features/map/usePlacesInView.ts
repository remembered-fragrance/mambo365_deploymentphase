import type { Place, PlaceKind } from '@mambo/contracts';
import type { Map as LeafletMap } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { isAbort, placesInView } from '@/data/hooks/usePlaces';
import { L } from '@/i18n/labels';
import { bboxString } from './geo';

export interface PlacesInView {
  readonly places: readonly Place[];
  readonly loading: boolean;
  readonly truncated: boolean;
  readonly error: string | null;
}

const DEBOUNCE_MS = 300;

const bboxOf = (map: LeafletMap): string => {
  const b = map.getBounds();
  return bboxString(b.getWest(), b.getSouth(), b.getEast(), b.getNorth());
};

/**
 * Địa điểm trong khung nhìn hiện tại. Gọi lại sau mỗi lần kéo / phóng to (chờ 300 ms cho người
 * dùng ngừng tay), huỷ lời gọi cũ còn đang bay. Phải dùng trong con của `<MapContainer>`.
 */
export const usePlacesInView = (kinds: readonly PlaceKind[], version: number): PlacesInView => {
  const [state, setState] = useState<PlacesInView>({ places: [], loading: true, truncated: false, error: null });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const kindsKey = kinds.join(',');

  const load = useCallback(
    async (map: LeafletMap) => {
      inFlight.current?.abort();
      if (!kindsKey) {
        setState({ places: [], loading: false, truncated: false, error: null });
        return;
      }
      const ctrl = new AbortController();
      inFlight.current = ctrl;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await placesInView(bboxOf(map), kindsKey, ctrl.signal);
        if (!ctrl.signal.aborted) setState({ places: res.items, loading: false, truncated: res.truncated, error: null });
      } catch (err) {
        if (ctrl.signal.aborted || isAbort(err)) return;
        setState((s) => ({ ...s, loading: false, error: L.mapLoadFailed }));
      }
    },
    [kindsKey],
  );

  const schedule = useCallback(
    (map: LeafletMap) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load(map), DEBOUNCE_MS);
    },
    [load],
  );

  const map = useMapEvents({ moveend: () => schedule(map) });

  // Lần đầu, đổi bộ lọc, hoặc sau khi thêm / sửa / gỡ (`version` tăng): tải ngay.
  useEffect(() => {
    void load(map);
  }, [map, load, version]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      inFlight.current?.abort();
    },
    [],
  );

  return state;
};
