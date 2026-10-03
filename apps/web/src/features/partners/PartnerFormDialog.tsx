import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { TrashIcon } from '@/components/ui/icons';
import type { PartyRole } from '@/core/partySelectors';
import { L } from '@/i18n/labels';

export interface PartyDraft {
  readonly id?: string;
  readonly name: string;
  readonly phone: string;
  readonly location: string;
  readonly note: string;
}

export const emptyParty = (): PartyDraft => ({ name: '', phone: '', location: '', note: '' });

interface PartnerFormDialogProps {
  readonly open: boolean;
  readonly role: PartyRole;
  readonly initial: PartyDraft;
  readonly onSave: (draft: PartyDraft) => void;
  readonly onDelete?: () => void;
  readonly onClose: () => void;
}

/** Thêm và sửa dùng CHUNG một form — hai form riêng là hai chỗ để lệch nhau. */
export function PartnerFormDialog({
  open,
  role,
  initial,
  onSave,
  onDelete,
  onClose,
}: PartnerFormDialogProps) {
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setTouched(false);
    }
  }, [open, initial]);

  const nameMissing = draft.name.trim().length === 0;
  const set = (patch: Partial<PartyDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = () => {
    setTouched(true);
    if (nameMissing) return;
    onSave(draft);
  };

  return (
    <Dialog
      open={open}
      title={draft.id ? L.editParty : role === 'supplier' ? L.addSupplier : L.addBuyer}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <Input
          label={L.partyName}
          value={draft.name}
          error={touched && nameMissing ? L.nameRequired : undefined}
          onChange={(e) => set({ name: e.target.value })}
        />
        <Input
          label={L.partyPhone}
          value={draft.phone}
          inputMode="tel"
          onChange={(e) => set({ phone: e.target.value })}
        />
        <Input
          label={L.partyArea}
          value={draft.location}
          onChange={(e) => set({ location: e.target.value })}
        />
        <Input
          label={L.note}
          value={draft.note}
          onChange={(e) => set({ note: e.target.value })}
        />

        <Button tone="primary" size="lg" block onClick={submit}>
          {L.save}
        </Button>

        {onDelete && (
          <Button tone="danger" block onClick={onDelete}>
            <TrashIcon className="h-4 w-4" />
            {L.del}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
