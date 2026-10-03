import { useMemo } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataView } from '@/components/data/DataView';
import { EmptyState } from '@/components/ui/EmptyState';
import { WarningIcon } from '@/components/ui/icons';
import { formatVnd } from '@/core/format';
import { inventoryValues } from '@/core/inventory';
import { useStore } from '@/data/useStore';
import { L, SUB } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { inventoryColumns } from './inventoryColumns';

/** Tồn kho — hàng còn trong kho, tính theo cân thực tế. */
export function InventoryPage() {
  const { data } = useStore();
  const rows = useMemo(() => inventoryValues(data), [data]);
  const columns = useMemo(() => inventoryColumns(), []);

  const negative = rows.filter((r) => r.stockKg < 0);
  const totalValue = rows.reduce((sum, r) => sum + r.stockValue, 0);

  return (
    <PageContainer width="content">
      <PageHeader
        title={L.navInventory}
        subtitle={SUB.inventory}
        actions={<HelpButton topic="inventory" />}
      />

      {rows.length > 0 && (
        <p className="num mb-2 rounded-lg border border-rule bg-card px-3 py-2 text-sm font-semibold text-ink-2">
          {L.stockValue}: {formatVnd(totalValue)}
        </p>
      )}

      <DataView
        rows={rows}
        columns={columns}
        getKey={(row) => row.productName}
        caption={L.navInventory}
        empty={<EmptyState title={L.noStock} description={L.noStockHint} icon="📦" />}
      />

      {negative.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-alert bg-card px-3 py-2 text-sm font-medium text-alert">
          <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            {negative.map((r) => r.productName).join(', ')} — {L.negativeStockHint}
          </span>
        </p>
      )}

      <p className="mt-3 text-sm text-ink-3">{L.stockBasisNote}</p>
    </PageContainer>
  );
}
