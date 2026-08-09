import { Button } from '@/components/ui/Button';
import { formatVnd } from '@/core/format';
import { numberToVietnameseWords } from '@/core/numberToWords';
import { L } from '@/i18n/labels';
import type { SaveState } from './useDraftReceipt';

interface ReceiptSummaryProps {
  readonly total: number;
  readonly canFinish: boolean;
  readonly saveState: SaveState;
  readonly onPayFull: () => void;
  readonly onPayPart: () => void;
}

const SAVE_LABEL: Record<SaveState, string> = {
  idle: '',
  saving: L.savingDraft,
  saved: L.savedDraft,
};

/**
 * Tổng tiền LUÔN nhìn thấy: thanh dính đáy ở điện thoại, cột phải dính ở máy tính.
 * Người dùng đọc con số này to tiếng cho người bán nghe trước khi trả tiền.
 *
 * Hai nút kết thúc đặt cạnh nhau nhưng khác trọng số rõ rệt; thêm "& in" về sau
 * chỉ là đổi nhãn, không phải sửa bố cục.
 */
export function ReceiptSummary({
  total,
  canFinish,
  saveState,
  onPayFull,
  onPayPart,
}: ReceiptSummaryProps) {
  return (
    <div className="card sticky bottom-20 z-20 flex flex-col gap-3 p-4 lg:bottom-4">
      <div>
        <p className="text-sm font-semibold text-ink-3">{L.total}</p>
        <p aria-live="polite" className="num text-3xl font-extrabold text-brand">
          {formatVnd(total)}
        </p>
        {total > 0 && (
          <p className="text-sm text-ink-3">
            {L.amountInWords}: {numberToVietnameseWords(total)} đồng
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button tone="primary" size="lg" block disabled={!canFinish} onClick={onPayFull}>
          {L.payFullAndFinish}
        </Button>
        <Button size="lg" block disabled={!canFinish} onClick={onPayPart}>
          {L.payPartAndFinish}
        </Button>
      </div>

      <p aria-live="polite" className="min-h-4 text-xs text-ink-3">
        {canFinish ? SAVE_LABEL[saveState] : L.nothingToFinish}
      </p>
    </div>
  );
}
