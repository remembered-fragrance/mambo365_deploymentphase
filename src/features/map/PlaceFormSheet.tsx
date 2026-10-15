import { type Place, PlaceInput } from '@mambo/contracts';
import { type FormEvent, useId, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { createPlace, placeErrorMessage, placeFieldErrors, removePlace, updatePlace } from '@/data/hooks/usePlaces';
import { L } from '@/i18n/labels';
import { formatLatLng, type LatLng, roundLatLng } from './geo';

export interface PlaceFormValues {
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly description: string;
}

export const EMPTY_FORM: PlaceFormValues = { name: '', address: '', phone: '', description: '' };

export const formFromPlace = (p: Place): PlaceFormValues => ({
  name: p.name,
  address: p.address ?? '',
  phone: p.phone ?? '',
  description: p.description ?? '',
});

type FieldName = keyof PlaceFormValues | 'lat';
type Errors = Partial<Record<FieldName, string>>;

const FIELD_NAMES: readonly FieldName[] = ['name', 'address', 'phone', 'description', 'lat'];
const isFieldName = (key: PropertyKey): key is FieldName => FIELD_NAMES.some((f) => f === key);

/** Lỗi kiểm ở máy (cùng schema với máy chủ) → lỗi từng ô; `lng` gộp vào dòng "Vị trí". */
export const validatePlace = (values: PlaceFormValues, position: LatLng): Errors => {
  const parsed = PlaceInput.safeParse({ ...values, ...roundLatLng(position) });
  if (parsed.success) return {};
  const errors: Errors = {};
  for (const issue of parsed.error.issues) {
    const head = issue.path[0] === 'lng' ? 'lat' : issue.path[0];
    if (head !== undefined && isFieldName(head)) errors[head] ??= issue.message;
  }
  return errors;
};

function TextArea({
  label,
  hint,
  error,
  value,
  maxLength,
  onChange,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly value: string;
  readonly maxLength: number;
  readonly onChange: (value: string) => void;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`input-base min-h-24 resize-y ${error ? 'border-alert' : ''}`}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * Thêm / sửa địa điểm. Giá trị form do trang bản đồ giữ (`values`) để khi người dùng quay lại bản
 * đồ dời ghim rồi mở lại form, chữ đã gõ không mất.
 */
export function PlaceFormSheet({
  target,
  position,
  values,
  onChange,
  onRepick,
  onSaved,
  onRemoved,
  onClose,
}: {
  /** null = thêm mới. */
  readonly target: Place | null;
  readonly position: LatLng;
  readonly values: PlaceFormValues;
  readonly onChange: (values: PlaceFormValues) => void;
  readonly onRepick: () => void;
  readonly onSaved: (place: Place) => void;
  readonly onRemoved: (id: string) => void;
  readonly onClose: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const set = (key: keyof PlaceFormValues) => (value: string) => onChange({ ...values, [key]: value });

  const fail = (err: unknown) => {
    const fields = placeFieldErrors(err);
    setErrors(Object.fromEntries(Object.entries(fields).filter(([k]) => isFieldName(k))));
    setFormError(Object.keys(fields).length > 0 ? null : placeErrorMessage(err));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const local = validatePlace(values, position);
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) return;

    setBusy(true);
    try {
      const input = { ...values, ...roundLatLng(position) };
      onSaved(target ? await updatePlace(target.id, input) : await createPlace(input));
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!target) return;
    setConfirmRemove(false);
    setBusy(true);
    try {
      await removePlace(target.id);
      onRemoved(target.id);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  return (
    <>
      <BottomSheet open={!confirmRemove} title={target ? L.placeEditTitle : L.placeAddTitle} onClose={busy ? () => undefined : onClose}>
        <form className="mx-auto flex max-w-lg flex-col gap-4" onSubmit={(e) => void submit(e)} noValidate>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rule bg-paper px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-2">{L.placePosition}</p>
              <p className="num truncate font-mono text-sm text-ink">{formatLatLng(position)}</p>
            </div>
            <Button className="min-h-10 shrink-0 px-3 text-sm" onClick={onRepick} disabled={busy}>
              {L.placeRepick}
            </Button>
          </div>
          {errors.lat ? <p className="-mt-2 text-sm font-medium text-alert">{errors.lat}</p> : null}

          <Input
            label={`${L.placeName} *`}
            value={values.name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder={L.placeNamePlaceholder}
            maxLength={120}
            error={errors.name}
            required
          />
          <Input
            label={L.placeAddress}
            value={values.address}
            onChange={(e) => set('address')(e.target.value)}
            autoComplete="street-address"
            maxLength={255}
            error={errors.address}
          />
          <Input
            label={L.placePhone}
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => set('phone')(e.target.value)}
            maxLength={20}
            hint={L.placePhoneHint}
            error={errors.phone}
          />
          <TextArea
            label={L.placeDescription}
            hint={L.placeDescriptionHint}
            value={values.description}
            maxLength={1000}
            onChange={set('description')}
            error={errors.description}
          />

          {formError ? (
            <p role="alert" className="text-sm font-medium text-alert">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {target ? (
              <Button tone="danger" onClick={() => setConfirmRemove(true)} disabled={busy}>
                {L.placeRemove}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <Button block onClick={onClose} disabled={busy}>
                {L.cancel}
              </Button>
              <Button type="submit" tone="primary" block disabled={busy}>
                {busy ? L.placeSaving : target ? L.save : L.placeSubmitNew}
              </Button>
            </div>
          </div>
        </form>
      </BottomSheet>

      {target ? (
        <ConfirmDialog
          open={confirmRemove}
          title={L.placeRemoveTitle}
          consequence={`"${target.name}" ${L.placeRemoveConsequence}`}
          confirmLabel={L.placeRemove}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmRemove(false)}
        />
      ) : null}
    </>
  );
}
