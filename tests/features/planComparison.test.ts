import { describe, expect, it } from 'vitest';
import { entitlementsFor } from '@mambo/contracts';
import { ROWS } from '@/features/billing/PlanComparison';

/** Màn so sánh gói chỉ được hứa cái code thật sự chặn (KE_HOACH_GOI_PRO §7) — lần trước hứa sai ba dòng. */
describe('màn so sánh gói khớp bảng quyền lợi', () => {
  const paid = entitlementsFor('trader', 'premium', 'vua');
  const solo = entitlementsFor('trader', 'premium', 'thuong_lai');
  const free = entitlementsFor('trader', 'free', 'vua');

  it('dòng khác nhau giữa hai bên: gói trả phí có quyền lợi đó, gói miễn phí không có', () => {
    for (const row of ROWS.filter((r) => r.free !== r.paid)) {
      expect(row.entitlement, row.what).toBeDefined();
      if (!row.entitlement) continue;
      expect(paid, row.what).toContain(row.entitlement);
      expect(free, row.what).not.toContain(row.entitlement);
    }
  });

  it('câu "Gói Thương lái" có đúng ở dòng gói Thương lái không có quyền lợi đó (0.28.0)', () => {
    for (const row of ROWS) {
      const excluded = row.entitlement !== undefined && paid.includes(row.entitlement) && !solo.includes(row.entitlement);
      expect(row.solo !== undefined && row.solo !== row.paid, row.what).toBe(excluded);
    }
  });

  it('dòng không gắn quyền lợi thì hai bên như nhau (công nợ, xuất file, nông hộ giữ ở miễn phí)', () => {
    for (const row of ROWS.filter((r) => !r.entitlement)) expect(row.free, row.what).toBe(row.paid);
  });
});
