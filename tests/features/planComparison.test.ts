import { describe, expect, it } from 'vitest';
import { entitlementsFor } from '@mambo/contracts';
import { ROWS } from '@/features/billing/PlanComparison';

/** Màn so sánh gói chỉ được hứa cái code thật sự chặn (KE_HOACH_GOI_PRO §7) — lần trước hứa sai ba dòng. */
describe('màn so sánh gói khớp bảng quyền lợi', () => {
  const paid = entitlementsFor('trader', 'premium');
  const free = entitlementsFor('trader', 'free');

  it('dòng khác nhau giữa hai bên: gói trả phí có quyền lợi đó, gói miễn phí không có', () => {
    for (const row of ROWS.filter((r) => r.free !== r.paid)) {
      expect(row.entitlement, row.what).toBeDefined();
      if (!row.entitlement) continue;
      expect(paid, row.what).toContain(row.entitlement);
      expect(free, row.what).not.toContain(row.entitlement);
    }
  });

  it('dòng không gắn quyền lợi thì hai bên như nhau (công nợ, xuất file, nông hộ giữ ở miễn phí)', () => {
    for (const row of ROWS.filter((r) => !r.entitlement)) expect(row.free, row.what).toBe(row.paid);
  });
});
