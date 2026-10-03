import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { TrashIcon } from '@/components/ui/icons';
import { lineTotals } from '@/core/calc';
import { formatVnd } from '@/core/format';
import type { Product, ProductFormulaType } from '@/core/types';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';
import { applyProduct, toLine, type LineDraft } from './lineDraft';

const FORMULA_OPTIONS: readonly { value: ProductFormulaType; label: string }[] = [
  { value: 'standard', label: L.formulaStandard },
  { value: 'netAfterTare', label: L.formulaNetAfterTare },
  { value: 'rubberLatex', label: L.formulaRubberLatex },
  { value: 'lossPercent', label: L.formulaLossPercent },
];

interface LineEditorProps {
  readonly line: LineDraft;
  readonly products: readonly Product[];
  readonly canRemove: boolean;
  readonly onChange: (patch: Partial<LineDraft>) => void;
  readonly onRemove: () => void;
}

/**
 * Một dòng hàng.
 *
 * Ô "Cách tính" GẬP LẠI: chọn mặt hàng là cách tính đã tự đúng rồi, hiện nó
 * thường trực chỉ là nhiễu trong 90% trường hợp.
 */
export function LineEditor({ line, products, canRemove, onChange, onRemove }: LineEditorProps) {
  const [showFormula, setShowFormula] = useState(false);
  const totals = lineTotals(toLine(line));

  return (
    <div className="card flex flex-col gap-3 p-3">
      <div className="flex flex-wrap gap-1.5">
        {products
          .filter((p) => p.isActive)
          .map((product) => (
            <Chip
              key={product.id}
              label={product.name}
              selected={line.productId === product.id}
              onSelect={() => onChange(applyProduct(line, product))}
            />
          ))}
      </div>

      <NumberField
        label={L.grossWeight}
        value={line.gross}
        unit={line.unit}
        onValueChange={(gross) => onChange({ gross })}
      />

      {line.formulaType === 'netAfterTare' && (
        <NumberField
          label={L.tareWeight}
          value={line.tare}
          unit={line.unit}
          onValueChange={(tare) => onChange({ tare })}
        />
      )}

      {line.formulaType === 'rubberLatex' && (
        <NumberField
          label={L.qualityPercent}
          value={line.quality}
          unit="%"
          onValueChange={(quality) => onChange({ quality })}
        />
      )}

      {line.formulaType === 'lossPercent' && (
        <NumberField
          label={L.lossPercent}
          value={line.loss}
          unit="%"
          onValueChange={(loss) => onChange({ loss })}
        />
      )}

      <NumberField
        label={L.pricePerUnit}
        value={line.price}
        unit={`₫/${line.unit}`}
        spoken
        onValueChange={(price) => onChange({ price })}
      />

      <div className="flex items-center justify-between gap-3 border-t border-rule pt-2">
        <span className="text-sm text-ink-3">{L.lineTotal}</span>
        <span aria-live="polite" className="num text-lg font-extrabold text-ink">
          {formatVnd(totals.total)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowFormula((v) => !v)}
          className="text-sm font-semibold text-brand"
        >
          {L.formulaEdit}
        </button>
        {canRemove && (
          <Button tone="danger" onClick={onRemove} aria-label={L.removeLine}>
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showFormula && (
        <Select
          label={L.formulaEdit}
          value={line.formulaType}
          options={FORMULA_OPTIONS}
          onValueChange={(value) => onChange({ formulaType: value as ProductFormulaType })}
        />
      )}
    </div>
  );
}
