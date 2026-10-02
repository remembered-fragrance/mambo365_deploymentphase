/**
 * Một action nghiệp vụ có thể đụng tới nhiều bảng: lập phiếu cho một người bán
 * mới vừa tạo hồ sơ người bán, vừa cập nhật giá gần nhất của mặt hàng.
 * File này so hai bản sổ trước/sau để tìm những thay đổi kéo theo đó.
 */

import type { AppData } from '@/core/types';
import { partyToInsert, productToInsert, productToPatch } from './mappers';
import { opInsert, opUpdate, type NewOp } from './queue';

export const derivedOps = (before: AppData, after: AppData, _userId?: string): NewOp[] => {
  const ops: NewOp[] = [];

  for (const supplier of after.suppliers) {
    if (before.suppliers.some((s) => s.id === supplier.id)) continue;
    ops.push(opInsert('supplier', supplier.id, partyToInsert(supplier)));
  }

  for (const buyer of after.buyers) {
    if (before.buyers.some((b) => b.id === buyer.id)) continue;
    ops.push(opInsert('buyer', buyer.id, partyToInsert(buyer)));
  }

  for (const product of after.products) {
    const old = before.products.find((p) => p.id === product.id);
    if (!old) {
      ops.push(opInsert('product', product.id, productToInsert(product)));
    } else if (old.lastPricePerUnit !== product.lastPricePerUnit) {
      // Sửa mặt hàng chỉ đổi giá gần nhất — hợp lệ với người cân (quyền receipt:create)
      ops.push(
        opUpdate('product', product.id, productToPatch({ lastPricePerUnit: product.lastPricePerUnit })),
      );
    }
  }

  return ops;
};
