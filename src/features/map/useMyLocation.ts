import { useCallback, useEffect, useRef, useState } from 'react';
import { L } from '@/i18n/labels';
import type { LatLng } from './geo';

export interface MyPosition extends LatLng {
  /** Bán kính sai số, mét. */
  readonly accuracy: number;
}

export type LocationProblem = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export interface MyLocation {
  readonly position: MyPosition | null;
  readonly locating: boolean;
  readonly problem: LocationProblem | null;
  /** Bật (lại) theo dõi vị trí — gọi từ nút "Vị trí của tôi" sau khi người dùng cho phép. */
  readonly start: () => void;
}

export const LOCATION_PROBLEM_TEXT: Readonly<Record<LocationProblem, string>> = {
  unsupported: L.mapLocationUnsupported,
  denied: L.mapLocationDenied,
  unavailable: L.mapLocationUnavailable,
  timeout: L.mapLocationTimeout,
};

const PROBLEM_BY_CODE: Readonly<Record<number, LocationProblem>> = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };

/**
 * Vị trí của tôi — theo dõi liên tục bằng `watchPosition`, chỉ khi đang mở màn bản đồ.
 * Vị trí CHỈ hiện trên máy người dùng: không gửi lên server, không lưu.
 */
export const useMyLocation = (autoStart = true): MyLocation => {
  const [position, setPosition] = useState<MyPosition | null>(null);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<LocationProblem | null>(null);
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setProblem('unsupported');
      return;
    }
    stop();
    setLocating(true);
    setProblem(null);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
        setProblem(null);
      },
      (err) => {
        setLocating(false);
        setProblem(PROBLEM_BY_CODE[err.code] ?? 'unavailable');
        // Bị chặn thì trình duyệt không gọi lại nữa — dừng hẳn, chờ người dùng bấm lại.
        if (err.code === 1) stop();
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }, [stop]);

  useEffect(() => {
    if (autoStart) start();
    return stop;
  }, [autoStart, start, stop]);

  return { position, locating, problem, start };
};
