import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/data/dataViewModel';
import { PencilIcon } from '@/components/ui/icons';
import { formatVnd, formatWeight } from '@/core/format';
import { previewRule } from '@/core/pricingPreview';
import type { PricingRule, Product } from '@/core/types';
import { L } from '@/i18n/labels';

const KIND_LABEL: Record<PricingRule['kind'], string> = {
  logistics: L.ruleKindLogistics,
  volumeDiscount: L.ruleKindVolume,
  manual: L.ruleKindManual,
};

/** Số tiền của quy tắc nói bằng dấu và chữ, không bắt đọc số âm. */
const amountText = (rule: PricingRule): string => {
  const parts: string[] = [];
  if (rule.fixedAmount !== undefined) {
    parts.push(`${rule.fixedAmount > 0 ? '+' : '−'} ${formatVnd(Math.abs(rule.fixedAmount))}`);
  }
  if (rule.percentOfTotal !== undefined) {
    parts.push(`${rule.percentOfTotal > 0 ? '+' : '−'} ${Math.abs(rule.percentOfTotal)}%`);
  }
  return parts.join(' · ') || '—';
};

export const pricingColumns = (
  products: readonly Product[],
  onToggle: (rule: PricingRule) => void,
  onEdit: (rule: PricingRule) => void,
): Column<PricingRule>[] => [
  {
    id: 'name',
    header: L.ruleName,
    cell: (rule) => (
      <button
        type="button"
        onClick={() => onEdit(rule)}
        className="text-left font-bold text-ink underline decoration-rule underline-offset-4"
      >
        {rule.name}
      </button>
    ),
    mobile: 'title',
    sortValue: (rule) => rule.name,
  },
  {
    id: 'kind',
    header: L.ruleKind,
    cell: (rule) => KIND_LABEL[rule.kind],
    mobile: 'secondary',
    hideBelow: 'lg',
  },
  {
    id: 'product',
    header: L.ruleApplyTo,
    cell: (rule) =>
      rule.productId
        ? (products.find((p) => p.id === rule.productId)?.name ?? L.ruleAllProducts)
        : L.ruleAllProducts,
    mobile: 'secondary',
    sortValue: (rule) => rule.productId ?? '',
  },
  {
    id: 'threshold',
    header: L.minWeightThreshold,
    cell: (rule) => (rule.minWeightKg ? formatWeight(rule.minWeightKg) : '—'),
    align: 'right',
    numeric: true,
    mobile: 'secondary',
    hideBelow: 'xl',
    sortValue: (rule) => rule.minWeightKg ?? 0,
  },
  {
    id: 'amount',
    header: L.adjustments,
    cell: amountText,
    align: 'right',
    numeric: true,
    mobile: 'value',
  },
  {
    id: 'preview',
    header: L.rulePreviewTitle,
    cell: (rule) => {
      const { applies, amount } = previewRule(rule);
      return applies && amount !== 0 ? formatVnd(amount) : L.ruleNoEffect;
    },
    align: 'right',
    numeric: true,
    mobile: 'hidden',
    hideBelow: 'xl',
  },
  {
    id: 'active',
    header: L.ruleOn,
    // Bật/tắt là một cái nút thật, KHÔNG phải lớp phủ mờ trên cả thẻ: bản demo
    // làm kiểu phủ và quên `pointer-events-none`, tắt xong không bật lại được.
    cell: (rule) => (
      <button type="button" onClick={() => onToggle(rule)} className="min-h-11">
        <Badge
          tone={rule.active ? 'in' : 'neutral'}
          mark={rule.active ? '✓' : '○'}
          label={rule.active ? L.ruleOn : L.ruleOff}
        />
      </button>
    ),
    align: 'right',
    mobile: 'badge',
    sortValue: (rule) => (rule.active ? 0 : 1),
  },
  {
    id: 'edit',
    header: '',
    cell: (rule) => (
      <button
        type="button"
        aria-label={`${L.editRule}: ${rule.name}`}
        onClick={() => onEdit(rule)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-rule text-ink-2"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    ),
    align: 'right',
    mobile: 'badge',
  },
];
