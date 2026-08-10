import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/data/DataView';
import type { SortState } from '@/components/data/dataViewModel';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import type { PricingRule } from '@/core/types';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { PricingRuleEditor } from './PricingRuleEditor';
import { pricingColumns } from './pricingColumns';
import { draftFromRule, emptyRuleDraft, type RuleDraft } from './ruleDraft';

/**
 * TẤT CẢ quy tắc giá trong một bảng — chung và theo mặt hàng.
 *
 * Bản demo chẻ đôi: quy tắc chung nằm trong Tiện ích, quy tắc theo mặt hàng
 * nằm trong thẻ mặt hàng. Hệ quả là không màn nào cho thấy đủ những gì đang
 * tác động lên một phiếu, và chủ vựa thấy tiền lệch mà không biết tìm ở đâu.
 */
export function PricingPage() {
  const { data, addPricingRule, updatePricingRule, deletePricingRule } = useStore();
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PricingRule | null>(null);
  const [sort, setSort] = useState<SortState>({ columnId: 'active', desc: false });

  const productFilter = params.get('product') ?? '';
  const rules = data.pricingRules ?? [];
  const shown = productFilter ? rules.filter((r) => r.productId === productFilter) : rules;

  const filterBy = (productId: string) => {
    const merged = new URLSearchParams(params);
    if (productId) merged.set('product', productId);
    else merged.delete('product');
    setParams(merged, { replace: true });
  };

  const toggle = (rule: PricingRule) => updatePricingRule(rule.id, { active: !rule.active });

  const save = (rule: Omit<PricingRule, 'id'>, id?: string) => {
    if (id) updatePricingRule(id, rule);
    else addPricingRule(rule);
    setDraft(null);
    toast({ message: `${L.save}: ${rule.name}` });
  };

  const remove = () => {
    const rule = confirmDelete;
    if (!rule) return;
    deletePricingRule(rule.id);
    setConfirmDelete(null);
    setDraft(null);
    toast({ message: `${L.del}: ${rule.name}`, tone: 'alert' });
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title={L.navPricing}
        subtitle={L.pricingSubtitle}
        actions={
          <>
            <HelpButton topic="pricing" />
            <Button tone="primary" onClick={() => setDraft(emptyRuleDraft(productFilter))}>
              <PlusIcon className="h-4 w-4" />
              {L.addRule}
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip label={L.filterAll} selected={!productFilter} onSelect={() => filterBy('')} />
        {data.products
          .filter((p) => p.isActive)
          .map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={productFilter === p.id}
              onSelect={() => filterBy(p.id)}
            />
          ))}
      </div>

      <DataView
        rows={shown}
        columns={pricingColumns(data.products, toggle, (rule) => setDraft(draftFromRule(rule)))}
        getKey={(rule) => rule.id}
        caption={L.navPricing}
        sort={sort}
        onSortChange={setSort}
        empty={<EmptyState title={L.noRules} description={L.noRulesHint} icon="⚖️" />}
      />

      <PricingRuleEditor
        open={draft !== null}
        initial={draft ?? emptyRuleDraft()}
        products={data.products}
        onSave={save}
        onDelete={
          draft?.id
            ? () => setConfirmDelete(rules.find((r) => r.id === draft.id) ?? null)
            : undefined
        }
        onClose={() => setDraft(null)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title={L.deleteRuleTitle}
        consequence={confirmDelete?.name ?? ''}
        confirmLabel={L.del}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageContainer>
  );
}
