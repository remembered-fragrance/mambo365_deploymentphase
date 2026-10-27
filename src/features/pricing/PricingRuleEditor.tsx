import { useEffect, useState } from 'react';
import { PRICING_RULE_LIMITS, RECEIPT_LIMITS } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { formatVnd, formatWeight } from '@mambo/core/format';
import { parseNumber } from '@mambo/core/parseNumber';
import { qualityStepOf } from '@mambo/core/pricing';
import { previewRule, SAMPLE_KG, SAMPLE_PRICE, type RulePreview } from '@mambo/core/pricingPreview';
import type { PricingRule, Product, QualityMetric } from '@mambo/core/types';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { L } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';
import { NumberField } from '../shared/NumberField';
import { METRIC_LABEL, METRIC_UNIT } from './quality';
import { emptyStep, stepsOf, toRule, type RuleDraft, type StepDraft } from './ruleDraft';

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

const MODE_OPTIONS = [
  { value: 'amount', label: L.ruleModeAmount },
  { value: 'quality', label: L.ruleModeQuality },
];

const METRIC_OPTIONS = (Object.keys(METRIC_LABEL) as QualityMetric[]).map((value) => ({
  value,
  label: `${METRIC_LABEL[value]} (${METRIC_UNIT[value]})`,
}));

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
  const [sample, setSample] = useState('');
  const paidQuality = useEntitlement('quality:pricing');

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setTouched(false);
      setSample('');
    }
  }, [open, initial]);

  const set = (patch: Partial<RuleDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setStep = (key: string, patch: Partial<StepDraft>) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  const nameMissing = draft.name.trim().length === 0;
  const quality = draft.mode === 'quality';
  // Hết gói: quy tắc chất lượng đã khai vẫn giữ và xoá được, nhưng không tạo / sửa (KE_HOACH_GOI_PRO §4.4).
  const locked = quality && !paidQuality;
  const steps = stepsOf(draft);
  const stepsMissing = quality && steps.length === 0;
  // `previewRule` cần một quy tắc hoàn chỉnh; bản nháp chưa có id thì mượn tạm.
  const preview = previewRule({ ...toRule(draft), id: draft.id ?? 'preview' });
  const sampleStep = sample.trim() === '' ? undefined : qualityStepOf(steps, parseNumber(sample));

  const submit = () => {
    setTouched(true);
    if (nameMissing || stepsMissing || locked) return;
    onSave(toRule(draft), draft.id);
  };

  return (
    <Dialog open={open} title={draft.id ? L.editRule : L.addRule} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input
          label={L.ruleName}
          value={draft.name}
          // Tên quy tắc thành nhãn khoản cộng/trừ trên phiếu — cùng giới hạn với nhãn (B4).
          maxLength={RECEIPT_LIMITS.adjustmentLabel}
          error={touched && nameMissing ? L.nameRequired : undefined}
          onChange={(e) => set({ name: e.target.value })}
        />

        {/* Đổi kiểu khi sửa sẽ để lại trường của kiểu cũ trên máy chủ — chỉ chọn lúc tạo. */}
        {!draft.id && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-2">{L.ruleMode}</span>
            <Segmented
              label={L.ruleMode}
              value={draft.mode}
              options={MODE_OPTIONS}
              onValueChange={(value) => set({ mode: value as RuleDraft['mode'] })}
            />
          </div>
        )}

        {locked ? (
          <PlanGate reason={L.gateQuality} feature="quality" />
        ) : (
          <>
            {!quality && (
              <Select
                label={L.ruleKind}
                value={draft.kind}
                options={KIND_OPTIONS}
                onValueChange={(value) => set({ kind: value as RuleDraft['kind'] })}
              />
            )}

            <Select
              label={L.ruleApplyTo}
              value={draft.productId}
              options={[
                { value: '', label: L.ruleAllProducts },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
              onValueChange={(productId) => set({ productId })}
            />

            {quality ? (
              <QualityFields
                draft={draft}
                sample={sample}
                sampleAmount={sampleStep?.amountPerUnit}
                error={touched && stepsMissing ? L.qualityStepsMissing : undefined}
                onChange={set}
                onStepChange={setStep}
                onSampleChange={setSample}
              />
            ) : (
              <AmountFields draft={draft} preview={preview} onChange={set} />
            )}

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
          </>
        )}

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

interface AmountFieldsProps {
  readonly draft: RuleDraft;
  readonly preview: RulePreview;
  readonly onChange: (patch: Partial<RuleDraft>) => void;
}

/** Khoản cộng / trừ: số tiền cố định, % tổng phiếu, ngưỡng kg, cách giao hàng. */
function AmountFields({ draft, preview, onChange: set }: AmountFieldsProps) {
  return (
    <>
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
        money
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
    </>
  );
}

interface QualityFieldsProps {
  readonly draft: RuleDraft;
  readonly sample: string;
  /** Mốc áp cho giá trị thử; `undefined` = dưới mốc đầu hoặc chưa gõ. */
  readonly sampleAmount?: number;
  readonly error?: string;
  readonly onChange: (patch: Partial<RuleDraft>) => void;
  readonly onStepChange: (key: string, patch: Partial<StepDraft>) => void;
  readonly onSampleChange: (value: string) => void;
}

/**
 * Bảng mốc của quy tắc theo chất lượng (V19). Mỗi mốc: TỪ giá trị nào, cộng hay trừ, bao nhiêu đồng mỗi kg
 * tính tiền (với mủ là kg quy khô). Ô "thử" nói ngay phiếu đo được bấy nhiêu thì cộng / trừ mấy.
 */
function QualityFields({
  draft,
  sample,
  sampleAmount,
  error,
  onChange: set,
  onStepChange,
  onSampleChange,
}: QualityFieldsProps) {
  const unit = METRIC_UNIT[draft.metric];
  const full = draft.steps.length >= PRICING_RULE_LIMITS.qualitySteps;

  return (
    <>
      <Select
        label={L.ruleMetric}
        value={draft.metric}
        options={METRIC_OPTIONS}
        onValueChange={(metric) => set({ metric: metric as QualityMetric })}
      />

      <fieldset className="flex flex-col gap-3 rounded-xl border border-rule p-3">
        <legend className="px-1 text-sm font-semibold text-ink-2">{L.qualitySteps}</legend>
        <p className="text-xs text-ink-3">{L.qualityStepsHint}</p>

        {draft.steps.map((step, i) => (
          <div key={step.key} className="flex flex-col gap-2 border-t border-rule pt-3 first:border-t-0 first:pt-0">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={`${L.qualityStepFrom} (${i + 1})`}
                value={step.from}
                unit={unit}
                onValueChange={(from) => onStepChange(step.key, { from })}
              />
              <NumberField
                label={L.qualityStepAmount}
                value={step.amount}
                unit="₫/kg"
                money
                onValueChange={(amount) => onStepChange(step.key, { amount })}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Segmented
                  label={`${L.ruleDirection} (${i + 1})`}
                  value={step.direction}
                  options={DIRECTION_OPTIONS}
                  onValueChange={(value) => onStepChange(step.key, { direction: value as StepDraft['direction'] })}
                />
              </div>
              {draft.steps.length > 1 && (
                <Button
                  tone="danger"
                  aria-label={`${L.removeQualityStep} ${i + 1}`}
                  onClick={() => set({ steps: draft.steps.filter((s) => s.key !== step.key) })}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {error && (
          <p role="alert" className="text-sm font-semibold text-alert">
            {error}
          </p>
        )}

        <Button block disabled={full} onClick={() => set({ steps: [...draft.steps, emptyStep()] })}>
          <PlusIcon className="h-4 w-4" />
          {full ? L.qualityStepsFull : L.addQualityStep}
        </Button>
      </fieldset>

      <div className="rounded-xl border border-rule bg-paper p-3">
        <NumberField label={L.qualityTry} value={sample} unit={unit} onValueChange={onSampleChange} />
        {sample.trim() !== '' && (
          <p aria-live="polite" className="num mt-2 text-base font-bold text-ink">
            {sampleAmount
              ? `${sampleAmount > 0 ? '+' : '−'} ${formatVnd(Math.abs(sampleAmount))}/kg`
              : L.qualityTryNone}
          </p>
        )}
      </div>
    </>
  );
}
