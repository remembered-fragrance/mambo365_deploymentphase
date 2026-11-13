import { useEffect, useState } from 'react';
import { PRODUCT_LIMITS, RECEIPT_LIMITS } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Product, ProductFormulaType, RubberKind } from '@mambo/core/types';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { L } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';
import { NumberField } from '../shared/NumberField';

export interface ProductDraft {
  readonly id?: string;
  readonly name: string;
  readonly unit: string;
  readonly formulaType: ProductFormulaType;
  /** Chỉ có nghĩa với công thức cao su (V20). */
  readonly rubberKind: RubberKind;
  /** (V24) Chỉ có nghĩa với công thức trừ hao hụt: kg tươi ra 1 kg nhân. Chuỗi như ô nhập; rỗng = không dùng. */
  readonly greenRatio: string;
  readonly trackInventory: boolean;
  readonly isActive: boolean;
}

export const emptyProduct = (): ProductDraft => ({
  name: '',
  unit: 'kg',
  formulaType: 'standard',
  rubberKind: 'latex',
  greenRatio: '',
  trackInventory: true,
  isActive: true,
});

export const draftFromProduct = (product: Product): ProductDraft => ({
  id: product.id,
  name: product.name,
  unit: product.unit,
  formulaType: product.formulaType,
  rubberKind: product.rubberKind ?? 'latex',
  greenRatio: product.greenRatio ? String(product.greenRatio).replace('.', ',') : '',
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

const RUBBER_KIND_OPTIONS = [
  { value: 'latex', label: L.rubberLatex },
  { value: 'cuplump', label: L.rubberCuplump },
];

interface ProductFormDialogProps {
  readonly open: boolean;
  readonly initial: ProductDraft;
  readonly onSave: (draft: ProductDraft) => void;
  readonly onClose: () => void;
}

export function ProductFormDialog({ open, initial, onSave, onClose }: ProductFormDialogProps) {
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);
  const paidRubber = useEntitlement('rubber:grades');
  // Mặt hàng đã là mủ tạp thì vẫn sửa được khi hết gói (không rút lại thứ đang dùng); chỉ khoá chọn mới.
  const canPickKind = paidRubber || initial.rubberKind === 'cuplump';
  // V24 cùng gói với giá theo chất lượng; tỷ lệ đã đặt thì vẫn sửa được khi hết gói.
  const paidQuality = useEntitlement('quality:pricing');
  const canSetRatio = paidQuality || initial.greenRatio !== '';

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
          maxLength={PRODUCT_LIMITS.name}
          error={touched && nameMissing ? L.nameRequired : undefined}
          onChange={(e) => set({ name: e.target.value })}
        />
        {/* Giới hạn đúng bằng schema đồng bộ (B4): gõ quá thì máy chủ từ chối cả op, ô chặn trước. */}
        <Input
          label={L.unitOfMeasure}
          value={draft.unit}
          maxLength={PRODUCT_LIMITS.unit}
          onChange={(e) => set({ unit: e.target.value })}
        />
        <Select
          label={L.formulaEdit}
          value={draft.formulaType}
          options={FORMULA_OPTIONS}
          onValueChange={(value) => set({ formulaType: value as ProductFormulaType })}
        />
        {draft.formulaType === 'rubberLatex' &&
          (canPickKind ? (
            <Select
              label={L.rubberKind}
              value={draft.rubberKind}
              options={RUBBER_KIND_OPTIONS}
              onValueChange={(value) => set({ rubberKind: value as RubberKind })}
            />
          ) : (
            <PlanGate reason={L.gateRubberKind} feature="rubber" />
          ))}
        {draft.formulaType === 'lossPercent' &&
          (canSetRatio ? (
            <div>
              <NumberField
                label={L.greenRatio}
                value={draft.greenRatio}
                max={RECEIPT_LIMITS.greenRatio}
                onValueChange={(greenRatio) => set({ greenRatio })}
              />
              <p className="mt-1 text-sm text-ink-3">{L.greenRatioHint}</p>
            </div>
          ) : (
            <PlanGate reason={L.gateGreenRatio} feature="quality" />
          ))}

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
