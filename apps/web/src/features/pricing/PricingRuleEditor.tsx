import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { TrashIcon } from '@/components/ui/icons';
import { formatVnd, formatWeight } from '@/core/format';
import { previewRule, SAMPLE_KG, SAMPLE_PRICE } from '@/core/pricingPreview';
import type { PricingRule, Product } from '@/core/types';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';
import { toRule, type RuleDraft } from './ruleDraft';

interface PricingRuleEditorProps {
  readonly open: boolean;
  readonly initial: RuleDraft;
  readonly products: readonly Product[];
  readonly onSave: (rule: Omit<PricingRule, 'id'>, id?: string) => void;
  readonly onDelete?: () => void;
  readonly onClose: () => void;
}

const KIND_OPTIONS = [
  { value: 'logistics', label: L.ruleKindLogistics },
  { value: 'volumeDiscount', label: L.ruleKindVolume },
  { value: 'manual', label: L.ruleKindManual },
];

const DIRECTION_OPTIONS = [
  { value: 'add', label: L.addAmount },
  { value: 'subtract', label: L.subtractAmount },
];

const TRANSPORT_OPTIONS = [
  { value: 'both', label: L.ruleBothWays },
  { value: 'pickup', label: L.rulePickupOnly },
  { value: 'bring', label: L.ruleBringOnly },
];

/**
 * MỘT trình sửa quy tắc giá cho cả hai lối vào (trang Quy tắc giá và thẻ mặt
 * hàng). Bản demo có hai bản chép tay ~90 dòng mỗi bản và chúng đã lệch nhau:
 * một bên sửa được lỗi tắt-rồi-không-bật-lại-được, bên kia thì không.
 *
 * Người dùng KHÔNG gõ số âm. Chọn "Cộng thêm" hay "Trừ bớt" rồi nhập số dương
 * — dấu là việc của code (§16.3).
 */
export function PricingRuleEditor({
  open,
  initial,
  products,
  onSave,
  onDelete,
  onClose,
}: PricingRuleEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setTouched(false);
    }
  }, [open, initial]);

  const set = (patch: Partial<RuleDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const nameMissing = draft.name.trim().length === 0;
  // `previewRule` cần một quy tắc hoàn chỉnh; bản nháp chưa có id thì mượn tạm.
  const preview = previewRule({ ...toRule(draft), id: draft.id ?? 'preview' });

  const submit = () => {
    setTouched(true);
    if (nameMissing) return;
    onSave(toRule(draft), draft.id);
  };

  return (
    <Dialog open={open} title={draft.id ? L.editRule : L.addRule} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input
          label={L.ruleName}
          value={draft.name}
          error={touched && nameMissing ? L.nameRequired : undefined}
          onChange={(e) => set({ name: e.target.value })}
        />

        <Select
          label={L.ruleKind}
          value={draft.kind}
          options={KIND_OPTIONS}
          onValueChange={(value) => set({ kind: value as RuleDraft['kind'] })}
        />

        <Select
          label={L.ruleApplyTo}
          value={draft.productId}
          options={[
            { value: '', label: L.ruleAllProducts },
            ...products.map((p) => ({ value: p.id, label: p.name })),
          ]}
          onValueChange={(productId) => set({ productId })}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{L.ruleDirection}</span>
          <Segmented
            label={L.ruleDirection}
            value={draft.direction}
            options={DIRECTION_OPTIONS}
            onValueChange={(value) => set({ direction: value as RuleDraft['direction'] })}
          />
        </div>

        <NumberField
          label={L.ruleFixedAmount}
          value={draft.fixedAmount}
          spoken
          onValueChange={(fixedAmount) => set({ fixedAmount })}
        />
        <NumberField
          label={L.rulePercent}
          value={draft.percent}
          unit="%"
          onValueChange={(percent) => set({ percent })}
        />
        <NumberField
          label={L.minWeightThreshold}
          value={draft.minWeightKg}
          unit="kg"
          onValueChange={(minWeightKg) => set({ minWeightKg })}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{L.ruleTransport}</span>
          <Segmented
            label={L.ruleTransport}
            value={draft.transport}
            options={TRANSPORT_OPTIONS}
            onValueChange={(value) => set({ transport: value as RuleDraft['transport'] })}
          />
        </div>

        {/* Xem trước: hiểu quy tắc làm gì TRƯỚC khi bật, không phải sau khi
            thấy tiền trên phiếu lệch. */}
        <div className="rounded-xl border border-rule bg-paper p-3">
          <p className="text-sm font-semibold text-ink-2">{L.rulePreviewTitle}</p>
          <p className="num mt-1 text-sm text-ink">
            {formatWeight(SAMPLE_KG)} × {formatVnd(SAMPLE_PRICE)} ={' '}
            {formatVnd(preview.totalAmount)}
          </p>
          <p className="num mt-1 text-base font-bold text-ink">
            {preview.applies && preview.amount !== 0
              ? `${preview.amount > 0 ? '+' : '−'} ${formatVnd(Math.abs(preview.amount))}`
              : L.ruleNoEffect}
          </p>
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-ink-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set({ active: e.target.checked })}
            className="h-5 w-5 accent-[var(--color-brand)]"
          />
          {draft.active ? L.ruleOn : L.ruleOff}
        </label>

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
