import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { newId } from '@/core/id';
import { formatVnd } from '@/core/format';
import type { PriceAdjustment } from '@/core/types';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';
import { AttachmentPicker } from './AttachmentPicker';
import { parseNumber } from '@/core/parseNumber';

interface MoreInfoPanelProps {
  readonly adjustments: readonly PriceAdjustment[];
  readonly note: string;
  readonly attachmentIds: readonly string[];
  readonly onAdjustmentsChange: (next: readonly PriceAdjustment[]) => void;
  readonly onNoteChange: (note: string) => void;
  readonly onAttachmentsChange: (ids: readonly string[]) => void;
}

/**
 * Hiển thị dần: mặc định màn tạo phiếu chỉ có Người bán · Mặt hàng · Cân được ·
 * Đơn giá · Thành tiền. Những thứ ít dùng gập sau nút này.
 *
 * Khoản cộng/trừ nhập bằng HAI NÚT chứ không bắt gõ số âm — "âm để trừ" là câu
 * của lập trình viên, không phải của chủ vựa.
 */
export function MoreInfoPanel({
  adjustments,
  note,
  attachmentIds,
  onAdjustmentsChange,
  onNoteChange,
  onAttachmentsChange,
}: MoreInfoPanelProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const add = (sign: 1 | -1) => {
    const value = parseNumber(amount);
    if (value <= 0) return;
    onAdjustmentsChange([
      ...adjustments,
      {
        id: newId(),
        kind: 'manual',
        label: label.trim() || L.adjustments,
        amount: sign * value,
      },
    ]);
    setLabel('');
    setAmount('');
  };

  if (!open) {
    return (
      <Button block onClick={() => setOpen(true)}>
        {L.moreInfo}
      </Button>
    );
  }

  return (
    <div className="card flex flex-col gap-3 p-3">
      <p className="text-sm font-bold text-ink">{L.adjustments}</p>

      {adjustments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {adjustments.map((adj) => (
            <li key={adj.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-2">{adj.label}</span>
              <span className="num font-semibold text-ink">{formatVnd(adj.amount)}</span>
              <button
                type="button"
                onClick={() => onAdjustmentsChange(adjustments.filter((a) => a.id !== adj.id))}
                className="text-sm font-semibold text-alert"
              >
                {L.del}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Input label={L.note} value={label} onChange={(e) => setLabel(e.target.value)} />
      <NumberField label={L.total} value={amount} spoken onValueChange={setAmount} />

      <div className="flex gap-2">
        <Button block onClick={() => add(1)}>
          {L.addAmount}
        </Button>
        <Button block onClick={() => add(-1)}>
          {L.subtractAmount}
        </Button>
      </div>

      <Input label={L.note} value={note} onChange={(e) => onNoteChange(e.target.value)} />

      <AttachmentPicker ids={attachmentIds} onChange={onAttachmentsChange} />
    </div>
  );
}
