import { describe, expect, it } from 'vitest';
import { kgString, lineNetWeight, linePhysicalWeight, roundToThousand, lineMoney } from './money';
import Decimal from 'decimal.js';

describe('lineNetWeight', () => {
  it('standard', () => {
    expect(Number(kgString(lineNetWeight({ formulaType: 'standard', grossWeight: '320' })))).toBe(320);
  });

  it('netAfterTare', () => {
    expect(
      Number(
        kgString(
          lineNetWeight({ formulaType: 'netAfterTare', grossWeight: '320', tareWeight: '20' }),
        ),
      ),
    ).toBe(300);
  });

  it('tare > gross → 0', () => {
    expect(
      Number(
        kgString(
          lineNetWeight({ formulaType: 'netAfterTare', grossWeight: '50', tareWeight: '60' }),
        ),
      ),
    ).toBe(0);
  });

  it('rubberLatex 31%', () => {
    expect(
      Number(
        kgString(
          lineNetWeight({ formulaType: 'rubberLatex', grossWeight: '320', qualityPercent: '31' }),
        ),
      ),
    ).toBe(99.2);
  });

  it('lossPercent 5%', () => {
    expect(
      Number(
        kgString(lineNetWeight({ formulaType: 'lossPercent', grossWeight: '200', lossPercent: '5' })),
      ),
    ).toBe(190);
  });

  it('negative gross → 0', () => {
    expect(Number(kgString(lineNetWeight({ formulaType: 'standard', grossWeight: '-10' })))).toBe(0);
  });
});

describe('linePhysicalWeight vs net', () => {
  it('cao su: vật lý 320, tính tiền 99.2', () => {
    const input = { formulaType: 'rubberLatex' as const, grossWeight: '320', qualityPercent: '31' };
    expect(Number(kgString(linePhysicalWeight(input)))).toBe(320);
    expect(Number(kgString(lineNetWeight(input)))).toBe(99.2);
  });
});

describe('money', () => {
  it('round to thousand', () => {
    expect(roundToThousand(new Decimal(19999)).toNumber()).toBe(20000);
  });

  it('line total uses net × price then round thousand', () => {
    const m = lineMoney({
      formulaType: 'rubberLatex',
      grossWeight: '320',
      qualityPercent: '31',
      unitPrice: '20000',
    });
    expect(m.netWeight.toNumber()).toBe(99.2);
    expect(m.rawTotal.toNumber()).toBe(1984000);
    expect(m.total.toNumber()).toBe(1984000);
  });
});
