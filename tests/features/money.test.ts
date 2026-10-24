/**
 * Ô tiền gõ được dấu phẩy nhưng tiền lưu là đồng nguyên — máy chủ từ chối số lẻ.
 */

import { describe, expect, it } from 'vitest';
import { isRoundedMoney, parseMoney } from '@/features/shared/money';
import { emptyRuleDraft, toRule } from '@/features/pricing/ruleDraft';

describe('parseMoney', () => {
  it('số nguyên giữ nguyên, kể cả có dấu chấm ngăn nghìn', () => {
    expect(parseMoney('50000')).toBe(50_000);
    expect(parseMoney('1.500.000')).toBe(1_500_000);
    expect(parseMoney('')).toBe(0);
  });

  it('số lẻ làm tròn tới đồng gần nhất, 0,5 làm tròn lên', () => {
    expect(parseMoney('50000,4')).toBe(50_000);
    expect(parseMoney('50000,5')).toBe(50_001);
    expect(parseMoney('0,4')).toBe(0);
  });

  it('chỉ báo "đã làm tròn" khi phần lẻ khác 0', () => {
    expect(isRoundedMoney('50000,5')).toBe(true);
    expect(isRoundedMoney('50000')).toBe(false);
    expect(isRoundedMoney('50000,')).toBe(false);
    expect(isRoundedMoney('50000,00')).toBe(false);
    expect(isRoundedMoney('')).toBe(false);
  });
});

describe('quy tắc giá — tiền cố định', () => {
  it('tiền cố định lẻ làm tròn, dấu theo chiều cộng/trừ', () => {
    const rule = toRule({ ...emptyRuleDraft(), name: 'Tiền xe', direction: 'subtract', fixedAmount: '50000,5' });
    expect(rule.fixedAmount).toBe(-50_001);
  });

  it('phần trăm và ngưỡng khối lượng vẫn được lẻ', () => {
    const rule = toRule({ ...emptyRuleDraft(), name: 'Hao', direction: 'add', percent: '1,5', minWeightKg: '12,5' });
    expect(rule.percentOfTotal).toBe(1.5);
    expect(rule.minWeightKg).toBe(12.5);
  });

  it('tiền cố định dưới 1 đồng coi như không có', () => {
    expect(toRule({ ...emptyRuleDraft(), name: 'x', fixedAmount: '0,4' }).fixedAmount).toBeUndefined();
  });
});
