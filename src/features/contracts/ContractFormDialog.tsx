import { useEffect, useState } from 'react';
import { RECEIPT_LIMITS } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import type { AppData, TransactionKind } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';
import { contractProblem, type ContractDraft, type ContractProblem } from './contractDraft';

const KIND_OPTIONS = [
  { value: 'purchase', label: L.contractBuy },
  { value: 'sale', label: L.contractSell },
];

const PROBLEM_TEXT: Record<ContractProblem, string> = {
  party: L.contractPartyRequired,
  product: L.contractProductRequired,
  quantity: L.contractQuantityRequired,
  period: L.contractEndBeforeStart,
};

interface Props {
  readonly open: boolean;
  readonly initial: ContractDraft;
  readonly data: AppData;
  readonly onSave: (draft: ContractDraft) => void;
  readonly onDelete?: () => void;
  readonly onClose: () => void;
}

export function ContractFormDialog({ open, initial, data, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setTouched(false);
    }
  }, [open, initial]);

  const set = (patch: Partial<ContractDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const parties = draft.kind === 'sale' ? data.buyers : data.suppliers;
  const products = data.products.filter((p) => p.isActive || p.id === draft.productId);
  const unit = products.find((p) => p.id === draft.productId)?.unit ?? 'kg';
  const problem = contractProblem(draft);
  const error = (field: ContractProblem) => (touched && problem === field ? PROBLEM_TEXT[field] : undefined);

  const submit = () => {
    setTouched(true);
    if (problem) return;
    onSave(draft);
  };

  return (
    <Dialog open={open} title={draft.id ? L.editContract : L.addContract} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Segmented
          label={L.contractKind}
          value={draft.kind}
          options={KIND_OPTIONS}
          // Đổi chiều thì người cũ không còn đúng danh sách (nông hộ ↔ người mua).
          onValueChange={(kind) => set({ kind: kind as TransactionKind, partyId: '' })}
        />
        <Select
          label={L.contractParty}
          value={draft.partyId}
          options={[
            { value: '', label: L.contractOtherParty },
            ...parties.map((p) => ({ value: p.id, label: p.name })),
          ]}
          onValueChange={(partyId) => set({ partyId })}
        />
        {!draft.partyId && (
          <Input
            label={L.contractPartyName}
            value={draft.partyName}
            maxLength={RECEIPT_LIMITS.partyName}
            error={error('party')}
            onChange={(e) => set({ partyName: e.target.value })}
          />
        )}
        <Select
          label={L.contractProduct}
          value={draft.productId}
          options={[{ value: '', label: L.contractPickProduct }, ...products.map((p) => ({ value: p.id, label: p.name }))]}
          hint={error('product')}
          onValueChange={(productId) => set({ productId })}
        />
        <NumberField
          label={L.contractQuantity}
          value={draft.quantity}
          unit={unit}
          max={RECEIPT_LIMITS.quantity}
          error={error('quantity')}
          onValueChange={(quantity) => set({ quantity })}
        />
        <NumberField
          label={L.contractPrice}
          value={draft.price}
          unit={`₫/${unit}`}
          money
          spoken
          max={RECEIPT_LIMITS.quantity}
          onValueChange={(price) => set({ price })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label={L.contractStart} type="date" value={draft.start} onChange={(e) => set({ start: e.target.value })} />
          <Input
            label={L.contractEnd}
            type="date"
            value={draft.end}
            error={error('period')}
            onChange={(e) => set({ end: e.target.value })}
          />
        </div>
        <Input label={L.note} value={draft.note} maxLength={RECEIPT_LIMITS.note} onChange={(e) => set({ note: e.target.value })} />

        <Button tone="primary" size="lg" block onClick={submit}>
          {L.save}
        </Button>
        {onDelete && (
          <Button tone="quiet" block onClick={onDelete}>
            {L.del}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
