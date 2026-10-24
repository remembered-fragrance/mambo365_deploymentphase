import { Button } from '@/components/ui/Button';
import { formatVnd } from '@mambo/core/format';
import { numberToVietnameseWords } from '@mambo/core/numberToWords';
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
  failed: L.draftNotSaved,
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
    // Điện thoại: thanh dính đáy phải gọn để không che ô đang nhập — tổng một dòng, hai nút một hàng,
    // số bằng chữ một dòng chữ nhỏ (vẫn phải có: đây là câu đọc cho người bán nghe trước khi trả tiền).
    // Đáy = thanh dưới (5rem) + vùng home indicator của iPhone, không thì thanh dưới che mép nút chốt.
    <div className="card sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 p-3 lg:bottom-4 lg:gap-3 lg:p-4">
      <div>
        <div className="max-lg:flex max-lg:items-baseline max-lg:justify-between max-lg:gap-3">
          <p className="text-sm font-semibold text-ink-3">{L.total}</p>
          <p aria-live="polite" className="num text-2xl font-extrabold text-brand lg:text-3xl">
            {formatVnd(total)}
          </p>
        </div>
        {total > 0 && (
          <p className="truncate text-xs text-ink-3 lg:whitespace-normal lg:text-sm">
            <span className="max-lg:hidden">{L.amountInWords}: </span>
            {numberToVietnameseWords(total)} đồng
          </p>
        )}
      </div>

      {/* Điện thoại: hai nút một hàng (chữ lg + px-5 sẽ xuống dòng ở 320–375px). Màn rộng: cột tổng
          chỉ 3/12, xếp chồng để mỗi nút một dòng chữ. */}
      <div className="flex gap-2 lg:flex-col">
        <Button
          tone="primary"
          size="lg"
          block
          className="max-lg:px-2 max-lg:text-base"
          disabled={!canFinish}
          onClick={onPayFull}
        >
          {L.payFullAndFinish}
        </Button>
        <Button
          size="lg"
          block
          className="max-lg:px-2 max-lg:text-base"
          disabled={!canFinish}
          onClick={onPayPart}
        >
          {L.payPartAndFinish}
        </Button>
      </div>

      <p aria-live="polite" className="min-h-4 text-xs text-ink-3">
        {canFinish ? SAVE_LABEL[saveState] : L.nothingToFinish}
      </p>
    </div>
  );
}
