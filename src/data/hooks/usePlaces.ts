/**
 * Bản đồ thu mua — cửa cho màn hình (features/ chỉ chạm data/ qua hooks). Hỏi lại khi đổi tổ chức.
 */

import type { PlacesList } from '@mambo/contracts';
import { listMyPlaces } from '../places';
import { useStore } from '../useStore';
import { useLoad, type Loaded } from './useLinked';

export {
  createPlace,
  getPlace,
  isAbort,
  placeErrorMessage,
  placeFieldErrors,
  placesInView,
  removePlace,
  updatePlace,
} from '../places';

/** Địa điểm của tổ chức đang làm việc. `enabled` = có `place:manage` (người khác → 403). */
export const useMyPlaces = (enabled = true): Loaded<PlacesList> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId && enabled ? listMyPlaces : null, currentOrgId ?? '');
};
