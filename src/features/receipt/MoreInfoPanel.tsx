import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { newId } from '@mambo/core/id';
import { formatVnd } from '@mambo/core/format';
import type { PriceAdjustment } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { parseMoney } from '../shared/money';
import { NumberField } from '../shared/NumberField';
import { AttachmentPicker } from './AttachmentPicker';
import { hasMoreInfo, moreInfoSummary } from './moreInfo';

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
 * Đơn giá · Thành tiền. Những thứ ít dùng gập sau nút này; mở ra rồi gập lại được.
 * Nháp mở lại mà đã có ghi chú / ảnh thì mở sẵn — không giấu thứ người dùng đã nhập.
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
  const panelId = useId();
  const [open, setOpen] = useState(() => hasMoreInfo({ adjustments, note, attachmentIds }));
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const add = (sign: 1 | -1) => {
    const value = parseMoney(amount);
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
    const summary = moreInfoSummary({ adjustments, note, attachmentIds });
    return (
      <Button block aria-expanded={false} onClick={() => setOpen(true)}>
        <span className="min-w-0 truncate">
          {L.moreInfo}
          {summary ? <span className="font-normal text-ink-2"> · {summary}</span> : null}
        </span>
      </Button>
    );
  }

  return (
    <div id={panelId} className="card flex flex-col gap-3 p-3">
      <div className="-mt-1 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">{L.adjustments}</p>
        <button
          type="button"
          aria-expanded
          aria-controls={panelId}
          onClick={() => setOpen(false)}
          className="min-h-10 rounded-xl px-3 text-sm font-semibold text-brand"
        >
          {L.collapse}
        </button>
      </div>

      {adjustments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {adjustments.map((adj) => (
            <li key={adj.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-2">{adj.label}</span>
              <span className="num font-semibold text-ink">{formatVnd(adj.amount)}</span>
              <button
                type="button"
                onClick={() => onAdjustmentsChange(adjustments.filter((a) => a.id !== adj.id))}
                aria-label={`${L.del} ${adj.label}`}
                className="text-sm font-semibold text-alert"
              >
                {L.del}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Input label={L.adjustmentLabel} value={label} onChange={(e) => setLabel(e.target.value)} />
      <NumberField label={L.adjustmentAmount} value={amount} spoken money onValueChange={setAmount} />

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
