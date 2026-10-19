import { useEffect, useState } from 'react';
import { PARTY_LIMITS } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { TrashIcon } from '@/components/ui/icons';
import type { PartyRole } from '@mambo/core/partySelectors';
import { L } from '@/i18n/labels';

export interface PartyDraft {
  readonly id?: string;
  readonly name: string;
  readonly phone: string;
  readonly location: string;
  readonly note: string;
}

export const emptyParty = (): PartyDraft => ({ name: '', phone: '', location: '', note: '' });

/**
 * Form → hồ sơ. Ô để trống là "xoá giá trị cũ": giữ chuỗi rỗng (lên máy chủ thành null — `partyToPatch`), KHÔNG
 * đổi thành `undefined` — patch bỏ qua `undefined`, máy chủ giữ số cũ rồi lần kéo sau trả lại đúng số vừa xoá (B5).
 */
export const partyFromDraft = (draft: PartyDraft) => ({
  name: draft.name.trim(),
  phone: draft.phone.trim(),
  location: draft.location.trim(),
  note: draft.note.trim(),
});

interface PartnerFormDialogProps {
  readonly open: boolean;
  readonly role: PartyRole;
  readonly initial: PartyDraft;
  /** Tên này đã có người khác trong danh bạ — lưu vẫn tạo người riêng, chỉ nhắc để khỏi tạo trùng (B3). */
  readonly hasNamesake: (name: string) => boolean;
  readonly onSave: (draft: PartyDraft) => void;
  readonly onDelete?: () => void;
  readonly onClose: () => void;
}

/** Thêm và sửa dùng CHUNG một form — hai form riêng là hai chỗ để lệch nhau. */
export function PartnerFormDialog({
  open,
  role,
  initial,
  hasNamesake,
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
  const namesake = !nameMissing && draft.name.trim() !== initial.name.trim() && hasNamesake(draft.name);
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
          maxLength={PARTY_LIMITS.name}
          error={touched && nameMissing ? L.nameRequired : undefined}
          hint={namesake ? L.partyNamesakeHint : undefined}
          onChange={(e) => set({ name: e.target.value })}
        />
        {/* Giới hạn đúng bằng schema đồng bộ (B4): gõ quá thì máy chủ từ chối cả op, ô chặn trước. */}
        <Input
          label={L.partyPhone}
          value={draft.phone}
          inputMode="tel"
          maxLength={PARTY_LIMITS.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <Input
          label={L.partyArea}
          value={draft.location}
          maxLength={PARTY_LIMITS.location}
          onChange={(e) => set({ location: e.target.value })}
        />
        <Input
          label={L.note}
          value={draft.note}
          maxLength={PARTY_LIMITS.note}
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
