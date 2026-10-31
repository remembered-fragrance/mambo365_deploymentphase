import { Button } from '@/components/ui/Button';
import { WarningIcon } from '@/components/ui/icons';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { droppedLines } from './syncNoticeText';

/**
 * Thay đổi app tự bỏ vì chủ đổi chi nhánh của người này (B10), liệt kê TỪNG phiếu / lần trả (người, ngày, số
 * tiền). Thứ bị bỏ có thể là tiền thật đã trao tay — toast vài giây rồi tắt thì người cân không kịp chép lại.
 * Ở yên đầu trang tới khi người dùng bấm "Đã ghi lại".
 */
export function BranchDropCard() {
  const { branchDropped, dismissBranchDropped } = useStore();
  if (branchDropped.length === 0) return null;

  return (
    <div role="alert" className="no-print border-b border-rule bg-card px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-alert">
        <WarningIcon className="h-4 w-4 shrink-0" />
        {L.branchDropTitle}
      </p>
      <p className="mt-1 text-ink-2">{L.branchDropBody}</p>
      <ul className="mt-2 list-disc pl-6 text-ink">
        {droppedLines(branchDropped).map((line, index) => (
          <li key={index} className="num">
            {line}
          </li>
        ))}
      </ul>
      <Button className="mt-2" onClick={dismissBranchDropped}>
        {L.branchDropDone}
      </Button>
    </div>
  );
}
