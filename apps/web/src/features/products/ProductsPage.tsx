import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/data/DataView';
import type { Column, SortState } from '@/components/data/dataViewModel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PencilIcon, PlusIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { formatVnd } from '@/core/format';
import type { Product } from '@/core/types';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { ROUTES } from '../shared/navItems';
import {
  draftFromProduct,
  emptyProduct,
  FORMULA_LABEL,
  ProductFormDialog,
  type ProductDraft,
} from './ProductFormDialog';

const productColumns = (
  ruleCount: (productId: string) => number,
  onEdit: (product: Product) => void,
): Column<Product>[] => [
  {
    id: 'name',
    header: L.productNameLabel,
    cell: (p) => (
      <button
        type="button"
        onClick={() => onEdit(p)}
        className="text-left font-bold text-ink underline decoration-rule underline-offset-4"
      >
        {p.name}
      </button>
    ),
    mobile: 'title',
    sortValue: (p) => p.name,
  },
  {
    id: 'formula',
    header: L.formulaEdit,
    cell: (p) => FORMULA_LABEL[p.formulaType],
    mobile: 'secondary',
  },
  {
    id: 'unit',
    header: L.unitOfMeasure,
    cell: (p) => p.unit,
    mobile: 'secondary',
    hideBelow: 'lg',
  },
  {
    id: 'rules',
    // Lối tắt sang trang Quy tắc giá, lọc sẵn đúng mặt hàng này.
    header: L.ruleCountShort,
    cell: (p) => (
      <Link to={`${ROUTES.pricing}?product=${p.id}`} className="font-semibold text-brand underline">
        {L.ruleCountShort} ({ruleCount(p.id)})
      </Link>
    ),
    mobile: 'badge',
    sortValue: (p) => ruleCount(p.id),
  },
  {
    id: 'lastPrice',
    header: L.lastPrice,
    cell: (p) => (p.lastPricePerUnit ? formatVnd(p.lastPricePerUnit) : '—'),
    align: 'right',
    numeric: true,
    mobile: 'value',
    sortValue: (p) => p.lastPricePerUnit ?? 0,
  },
  {
    id: 'state',
    header: L.productInUse,
    cell: (p) =>
      p.isActive ? (
        <Badge tone="in" mark="✓" label={L.productInUse} />
      ) : (
        <Badge tone="neutral" mark="○" label={L.productHidden} />
      ),
    align: 'right',
    mobile: 'badge',
    sortValue: (p) => (p.isActive ? 0 : 1),
  },
  {
    id: 'edit',
    header: '',
    cell: (p) => (
      <button
        type="button"
        aria-label={`${L.editParty}: ${p.name}`}
        onClick={() => onEdit(p)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-rule text-ink-2"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    ),
    align: 'right',
    mobile: 'badge',
  },
];

export function ProductsPage() {
  const { data, addProduct, updateProduct } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [sort, setSort] = useState<SortState>({ columnId: 'state', desc: false });

  const rules = data.pricingRules ?? [];
  const ruleCount = (productId: string) => rules.filter((r) => r.productId === productId).length;

  const save = (next: ProductDraft) => {
    const patch = {
      name: next.name.trim(),
      unit: next.unit.trim() || 'kg',
      formulaType: next.formulaType,
      trackInventory: next.trackInventory,
      isActive: next.isActive,
    };
    if (next.id) updateProduct(next.id, patch);
    else addProduct(patch);
    setDraft(null);
    toast({ message: `${L.save}: ${patch.name}` });
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title={L.navProducts}
        actions={
          <>
            <HelpButton topic="products" />
            <Button tone="primary" onClick={() => setDraft(emptyProduct())}>
              <PlusIcon className="h-4 w-4" />
              {L.addProduct}
            </Button>
          </>
        }
      />

      <DataView
        rows={data.products}
        columns={productColumns(ruleCount, (p) => setDraft(draftFromProduct(p)))}
        getKey={(p) => p.id}
        caption={L.navProducts}
        sort={sort}
        onSortChange={setSort}
        empty={<EmptyState title={L.noProducts} description={L.noProductsHint} icon="🏷️" />}
      />

      <ProductFormDialog
        open={draft !== null}
        initial={draft ?? emptyProduct()}
        onSave={save}
        onClose={() => setDraft(null)}
      />
    </PageContainer>
  );
}
