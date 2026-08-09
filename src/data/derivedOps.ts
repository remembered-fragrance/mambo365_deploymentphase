/**
 * Một action nghiệp vụ có thể đụng tới nhiều bảng: lập phiếu cho một người bán
 * mới vừa tạo hồ sơ người bán, vừa cập nhật giá gần nhất của mặt hàng.
 * File này so hai bản sổ trước/sau để tìm những thay đổi kéo theo đó.
 */

import type { AppData } from '@/core/types';
import { partyToRow, productToRow } from './mappers';
import { opInsert, opUpdate, type NewOp } from './queue';

export const derivedOps = (before: AppData, after: AppData, userId: string): NewOp[] => {
  const ops: NewOp[] = [];

  for (const supplier of after.suppliers) {
    if (before.suppliers.some((s) => s.id === supplier.id)) continue;
    ops.push(opInsert('suppliers', supplier.id, partyToRow(supplier, userId)));
  }

  for (const buyer of after.buyers) {
    if (before.buyers.some((b) => b.id === buyer.id)) continue;
    ops.push(opInsert('buyers', buyer.id, partyToRow(buyer, userId)));
  }

  for (const product of after.products) {
    const old = before.products.find((p) => p.id === product.id);
    if (!old) {
      ops.push(opInsert('products', product.id, productToRow(product, userId)));
    } else if (old.lastPricePerUnit !== product.lastPricePerUnit) {
      ops.push(opUpdate('products', product.id, productToRow(product, userId)));
    }
  }

  return ops;
};
