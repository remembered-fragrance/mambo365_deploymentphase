import { PLACES_PER_ORG_LIMIT, type Place } from '@mambo/contracts';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { placeErrorMessage, removePlace, useMyPlaces } from '@/data/hooks/usePlaces';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { formatLatLng } from './geo';
import { mapEditLink, mapViewLink } from './mapLinks';
import { KIND_BG } from './placeKinds';

const dateFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

const LINK_BUTTON = 'inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-base font-semibold';

/** Địa điểm của tổ chức đang làm việc — xem / sửa trên bản đồ, gỡ. Chỉ người có `place:manage`. */
export function MyPlacesPage() {
  const places = useMyPlaces();
  const toast = useToast();
  const [removing, setRemoving] = useState<Place | null>(null);

  const remove = async (place: Place) => {
    setRemoving(null);
    try {
      await removePlace(place.id);
      toast({ message: L.placeRemoved });
    } catch (err) {
      toast({ message: placeErrorMessage(err), tone: 'alert' });
    }
    places.reload();
  };

  const list = places.data;

  return (
    <PageContainer width="content">
      <PageHeader
        title={L.navMyPlaces}
        subtitle={list ? `${L.myPlacesUsed}: ${list.items.length} / ${PLACES_PER_ORG_LIMIT}` : L.myPlacesHint}
        actions={
          <Link to={ROUTES.map} className={`${LINK_BUTTON} border-brand bg-brand text-paper`}>
            {L.myPlacesOpenMap}
          </Link>
        }
      />

      {places.loading && !list ? (
        <Skeleton rows={3} label={L.loading} />
      ) : places.error ? (
        <ErrorState title={L.errorTitle} description={places.error} actions={<Button onClick={places.reload}>{L.retry}</Button>} />
      ) : !list || list.items.length === 0 ? (
        <EmptyState title={L.myPlacesEmpty} description={L.myPlacesEmptyHint} icon="📍" />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.items.map((place) => (
            <li key={place.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold text-ink">
                  <span className={`size-2.5 shrink-0 rounded-full ${KIND_BG[place.kind]}`} aria-hidden="true" />
                  <span className="truncate">{place.name}</span>
                </p>
                {place.address && <p className="text-sm text-ink-2">{place.address}</p>}
                {place.phone && <p className="num text-sm text-ink-2">{place.phone}</p>}
                <p className="num font-mono text-sm text-ink-3">{formatLatLng(place)}</p>
                <p className="text-sm text-ink-3">
                  {L.myPlacesUpdated} {dateFmt.format(new Date(place.updatedAt))}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link to={mapViewLink(place.id)} className={`${LINK_BUTTON} border-rule bg-card text-ink`}>
                  {L.myPlacesView}
                </Link>
                <Link to={mapEditLink(place.id)} className={`${LINK_BUTTON} border-rule bg-card text-ink`}>
                  {L.mapEdit}
                </Link>
                <Button tone="danger" onClick={() => setRemoving(place)}>
                  {L.placeRemove}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={removing !== null}
        title={L.placeRemoveTitle}
        consequence={`"${removing?.name ?? ''}" ${L.placeRemoveConsequence}`}
        confirmLabel={L.placeRemove}
        onConfirm={() => removing && void remove(removing)}
        onCancel={() => setRemoving(null)}
      />
    </PageContainer>
  );
}
