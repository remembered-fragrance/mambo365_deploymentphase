import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { roundToThousand } from '@/core/calc';
import { formatVnd } from '@/core/format';
import { moneyToVietnameseWords } from '@/core/numberToWords';
import { parseNumber } from '@/core/parseNumber';
import { L } from '@/i18n/labels';
import { NumberField } from '../shared/NumberField';

/**
 * Máy tính nhẩm: cân × giá.
 *
 * Dùng `<NumberField>` nên trên điện thoại mở đúng bàn phím số của app, và làm
 * tròn nghìn y như phiếu thật — nhẩm ra một số rồi lập phiếu ra số khác thì
 * cái máy tính này còn hại hơn không có.
 */
export function CalculatorCard() {
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');

  const total = roundToThousand(parseNumber(weight) * parseNumber(price));

  return (
    <Card title={L.calculator}>
      <div className="flex flex-col gap-3">
        <NumberField label={L.calcWeight} value={weight} unit="kg" onValueChange={setWeight} />
        <NumberField label={L.calcPrice} value={price} spoken onValueChange={setPrice} />

        <div className="rounded-xl border border-rule bg-paper p-3">
          <p className="text-sm text-ink-3">{L.calcResult}</p>
          <p className="num text-2xl font-extrabold text-ink">{formatVnd(total)}</p>
          {total > 0 && (
            <p className="mt-1 text-sm text-ink-3">{moneyToVietnameseWords(total)}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
