import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Product, ProductFormulaType } from '@/core/types';
import { L } from '@/i18n/labels';

export interface ProductDraft {
  readonly id?: string;
  readonly name: string;
  readonly unit: string;
  readonly formulaType: ProductFormulaType;
  readonly trackInventory: boolean;
  readonly isActive: boolean;
}

export const emptyProduct = (): ProductDraft => ({
  name: '',
  unit: 'kg',
  formulaType: 'standard',
  trackInventory: true,
  isActive: true,
});

export const draftFromProduct = (product: Product): ProductDraft => ({
  id: product.id,
  name: product.name,
  unit: product.unit,
  formulaType: product.formulaType,
  trackInventory: product.trackInventory !== false,
  isActive: product.isActive,
});

/** Bốn cách tính, gọi bằng tên người dùng hiểu — không lộ `netAfterTare` ra ngoài. */
export const FORMULA_LABEL: Record<ProductFormulaType, string> = {
  standard: L.formulaStandard,
  netAfterTare: L.formulaNetAfterTare,
  rubberLatex: L.formulaRubberLatex,
  lossPercent: L.formulaLossPercent,
};

const FORMULA_OPTIONS = Object.entries(FORMULA_LABEL).map(([value, label]) => ({ value, label }));

interface ProductFormDialogProps {
  readonly open: boolean;
  readonly initial: ProductDraft;
  readonly onSave: (draft: ProductDraft) => void;
  readonly onClose: () => void;
}

export function ProductFormDialog({ open, initial, onSave, onClose }: ProductFormDialogProps) {
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setTouched(false);
    }
  }, [open, initial]);

  const set = (patch: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const nameMissing = draft.name.trim().length === 0;

  const submit = () => {
    setTouched(true);
    if (nameMissing) return;
    onSave(draft);
  };

  return (
    <Dialog open={open} title={draft.id ? L.product : L.addProduct} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input
          label={L.productNameLabel}
          value={draft.name}
          error={touched && nameMissing ? L.nameRequired : undefined}
          onChange={(e) => set({ name: e.target.value })}
        />
        <Input
          label={L.unitOfMeasure}
          value={draft.unit}
          onChange={(e) => set({ unit: e.target.value })}
        />
        <Select
          label={L.formulaEdit}
          value={draft.formulaType}
          options={FORMULA_OPTIONS}
          onValueChange={(value) => set({ formulaType: value as ProductFormulaType })}
        />

        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-ink-2">
          <input
            type="checkbox"
            checked={draft.trackInventory}
            onChange={(e) => set({ trackInventory: e.target.checked })}
            className="h-5 w-5 accent-[var(--color-brand)]"
          />
          {L.trackInventory}
        </label>

        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-ink-2">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => set({ isActive: e.target.checked })}
            className="h-5 w-5 accent-[var(--color-brand)]"
          />
          {draft.isActive ? L.productInUse : L.productHidden}
        </label>

        <Button tone="primary" size="lg" block onClick={submit}>
          {L.save}
        </Button>
      </div>
    </Dialog>
  );
}
