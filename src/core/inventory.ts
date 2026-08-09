import { linePhysicalWeight } from './calc';
import { purchases, sales } from './selectors';
import type { AppData } from './types';

// ─── Inventory (Workstream F4) ────────────────────────────────────────────────

export interface InventoryRow {
  readonly productName: string;
  readonly purchasedKg: number;
  readonly soldKg: number;
  readonly stockKg: number;
}

/**
 * Tính tồn kho theo mặt hàng.
 * Dùng linePhysicalWeight (grossWeight) — KHÔNG dùng lineNetWeight để tránh sai số tồn kho
 * với cao su rubberLatex (lineNetWeight trả về KL quy đổi, không phải KL vật lý).
 */
export const inventoryByProduct = (data: AppData): InventoryRow[] => {
  const map = new Map<string, { purchased: number; sold: number }>();

  for (const t of purchases(data)) {
    for (const line of t.lines) {
      const name = line.productName || 'Mặt hàng';
      const cur = map.get(name) ?? { purchased: 0, sold: 0 };
      map.set(name, { ...cur, purchased: cur.purchased + linePhysicalWeight(line) });
    }
  }

  for (const t of sales(data)) {
    for (const line of t.lines) {
      const name = line.productName || 'Mặt hàng';
      const cur = map.get(name) ?? { purchased: 0, sold: 0 };
      map.set(name, { ...cur, sold: cur.sold + linePhysicalWeight(line) });
    }
  }

  return [...map.entries()]
    .map(([productName, { purchased, sold }]) => ({
      productName,
      purchasedKg: Math.round(purchased * 100) / 100,
      soldKg: Math.round(sold * 100) / 100,
      stockKg: Math.round((purchased - sold) * 100) / 100,
    }))
    .sort((a, b) => b.stockKg - a.stockKg);
};
