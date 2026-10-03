/**
 * Dòng hàng khi đang gõ. Đây là chỗ chuỗi người dùng nhập biến thành số tiền,
 * nên sai ở đây là sai tiền.
 */

import { describe, expect, it } from 'vitest';
import { applyProduct, emptyLine, fromLine, isUsable, toLine } from '@/features/receipt/lineDraft';
import { lineTotals } from '@/core/calc';
import type { Product } from '@/core/types';

const rubber: Product = {
  id: 'prod-rubber',
  name: 'Cao su',
  unit: 'kg',
  formulaType: 'rubberLatex',
  isSuggested: true,
  isActive: true,
  crop: 'rubber',
  lastPricePerUnit: 14_500,
};

const filled = () => ({
  ...emptyLine(),
  productName: 'Điều',
  formulaType: 'netAfterTare' as const,
  gross: '320',
  tare: '20',
  price: '28000',
});

describe('chọn mặt hàng', () => {
  it('điền sẵn cách tính, đơn vị và giá lần trước', () => {
    const line = applyProduct(emptyLine(), rubber);
    expect(line.formulaType).toBe('rubberLatex');
    expect(line.unit).toBe('kg');
    expect(line.price).toBe('14500');
    expect(line.crop).toBe('rubber');
  });

  it('KHÔNG đè giá người dùng vừa gõ tay', () => {
    const line = applyProduct({ ...emptyLine(), price: '15000' }, rubber);
    expect(line.price).toBe('15000');
  });
});

describe('đổi chuỗi đang gõ thành dòng hàng', () => {
  it('dấu phẩy là dấu thập phân', () => {
    expect(toLine({ ...emptyLine(), gross: '1,5' }).grossWeight).toBe(1.5);
  });

  it('dấu chấm là ngăn nghìn', () => {
    expect(toLine({ ...emptyLine(), price: '28.000' }).pricePerUnit).toBe(28_000);
  });

  it('chưa gõ tên mặt hàng thì để "Mặt hàng", không để trống', () => {
    expect(toLine(emptyLine()).productName).toBe('Mặt hàng');
  });

  it('chỉ gửi hàm lượng mủ khi cách tính cần tới nó', () => {
    expect(toLine({ ...emptyLine(), formulaType: 'netAfterTare', quality: '31' }).qualityPercent)
      .toBeUndefined();
    expect(toLine({ ...emptyLine(), formulaType: 'rubberLatex', quality: '31' }).qualityPercent)
      .toBe(31);
  });

  it('ra đúng số tiền của ví dụ thật: 320kg trừ bì 20, 28.000đ/kg', () => {
    expect(lineTotals(toLine(filled())).total).toBe(8_400_000);
  });
});

describe('đọc nháp cũ ra ô nhập', () => {
  it('đi một vòng không đổi số', () => {
    const draft = filled();
    expect(fromLine(toLine(draft))).toMatchObject({
      gross: '320',
      tare: '20',
      price: '28000',
      productName: 'Điều',
    });
  });

  it('số 0 hiện thành ô trống, không hiện "0"', () => {
    expect(fromLine(toLine(emptyLine())).gross).toBe('');
  });
});

describe('dòng đủ thông tin để tính tiền', () => {
  it('đủ cân và đủ giá thì tính được', () => {
    expect(isUsable(filled())).toBe(true);
  });

  it('thiếu cân hoặc thiếu giá thì chưa tính', () => {
    expect(isUsable({ ...filled(), gross: '' })).toBe(false);
    expect(isUsable({ ...filled(), price: '0' })).toBe(false);
  });

  it('cao su chưa nhập hàm lượng mủ thì chưa tính được', () => {
    const line = { ...filled(), formulaType: 'rubberLatex' as const, quality: '' };
    expect(isUsable(line)).toBe(false);
    expect(isUsable({ ...line, quality: '31' })).toBe(true);
  });
});
