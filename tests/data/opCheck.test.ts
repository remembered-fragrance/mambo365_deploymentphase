import { describe, expect, it } from 'vitest';
import { newId } from '@mambo/core/id';
import { DEFAULT_PRODUCTS } from '@mambo/core/catalog';
import { emptyData } from '@mambo/core/normalize';
import { derivedOps } from '@/data/derivedOps';
import { opProblem } from '@/data/opCheck';
import { opInsert, opSoftDelete, opUpdate } from '@/data/queue';

describe('kiểm op trước khi vào hàng đợi', () => {
  it('op hợp lệ thì qua', () => {
    expect(opProblem(opInsert('note', newId(), { body: 'Ghi chú' }))).toBeNull();
    expect(opProblem(opSoftDelete('note', newId()))).toBeNull();
  });

  it('id mặt hàng mẫu kiểu cũ và số vượt mức bị chặn, kèm tên trường', () => {
    expect(opProblem(opUpdate('product', 'prod-rubber', { lastPricePerUnit: 1 }))).toMatch(/recordId/);
    expect(opProblem(opInsert('note', newId(), { body: 'x'.repeat(6000) }))).toMatch(/^note\.data\.body/);
  });
});

describe('mặt hàng mẫu kiểu cũ không sinh thao tác', () => {
  it('đổi giá gần nhất của `prod-…` thì không gửi gì lên máy chủ', () => {
    const before = { ...emptyData(), products: [...DEFAULT_PRODUCTS] };
    const after = { ...before, products: before.products.map((p) => ({ ...p, lastPricePerUnit: 99 })) };
    expect(derivedOps(before, after)).toEqual([]);
  });
});
