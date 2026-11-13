/**
 * "Thêm thông tin khác" gập lại vẫn phải nói bên trong có gì — khoản trừ không được biến mất
 * khỏi mắt người chốt phiếu.
 */

import { describe, expect, it } from 'vitest';
import type { PriceAdjustment } from '@mambo/core/types';
import { hasMoreInfo, moreInfoSummary } from '@/features/receipt/moreInfo';

const adj = (id: string, amount: number): PriceAdjustment => ({ id, kind: 'manual', label: 'Tiền xe', amount });
const empty = { adjustments: [], note: '', attachmentIds: [] };

describe('moreInfo', () => {
  it('chưa nhập gì: không có gì để tóm tắt', () => {
    expect(hasMoreInfo(empty)).toBe(false);
    expect(moreInfoSummary(empty)).toBe('');
  });

  it('ghi chú chỉ có khoảng trắng coi như trống', () => {
    expect(hasMoreInfo({ ...empty, note: '   ' })).toBe(false);
  });

  it('kể đủ khoản cộng/trừ, ghi chú, ảnh theo thứ tự trên màn', () => {
    const info = { adjustments: [adj('a', 50_000), adj('b', -20_000)], note: 'Trả sau', attachmentIds: ['x'] };
    expect(hasMoreInfo(info)).toBe(true);
    expect(moreInfoSummary(info)).toBe('2 khoản cộng/trừ, có ghi chú, 1 ảnh');
  });

  it('chỉ có ảnh', () => {
    expect(moreInfoSummary({ ...empty, attachmentIds: ['x', 'y'] })).toBe('2 ảnh');
  });
});
