import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { CalculatorCard } from './CalculatorCard';
import { NotesCard } from './NotesCard';

/**
 * Tiện ích sau khi tách Quy tắc giá ra route riêng chỉ còn hai thứ: máy tính
 * và ghi chú. Máy tính rộng bằng ghi chú ở màn rộng, xếp dọc ở màn hẹp.
 */
export function UtilitiesPage() {
  return (
    <PageContainer width="content">
      <PageHeader title={L.navUtilities} actions={<HelpButton topic="utilities" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CalculatorCard />
        <NotesCard />
      </div>
    </PageContainer>
  );
}
