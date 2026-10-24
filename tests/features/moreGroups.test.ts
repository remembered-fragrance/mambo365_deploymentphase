/**
 * Trang "Thêm" chia nhóm theo sidebar. Mục nằm ngoài mọi nhóm thì biến mất khỏi điện thoại — mất đường vào một màn —
 * nên mỗi vai trò phải thấy đủ, đúng một lần, mọi mục ngoài thanh dưới.
 */

import { describe, expect, it } from 'vitest';
import { MEMBER_ROLES, ORG_TYPES, permissionsOf } from '@mambo/contracts';
import type { Access } from '@/features/shared/access';
import { moreGroups, navItems, secondaryItems } from '@/features/shared/navItems';

const accessOf = (type: (typeof ORG_TYPES)[number], role: (typeof MEMBER_ROLES)[number]): Access => ({
  orgType: type,
  permissions: [...permissionsOf(type, role)],
});

const ids = (groups: ReturnType<typeof moreGroups>) => groups.flatMap((g) => g.items.map((i) => i.id));

describe('trang "Thêm"', () => {
  it('🔴 mọi vai trò: đủ các mục ngoài thanh dưới, mỗi mục đúng một lần', () => {
    for (const type of ORG_TYPES) {
      for (const role of MEMBER_ROLES) {
        const access = accessOf(type, role);
        const bar = new Set(navItems({ drafts: 0, overdue: 0 }, access).map((i) => i.id));
        const expected = secondaryItems(access).map((i) => i.id).filter((id) => !bar.has(id));
        const shown = ids(moreGroups(access));
        expect(new Set(shown).size, `${type}/${role} trùng mục`).toBe(shown.length);
        expect([...shown].sort(), `${type}/${role}`).toEqual([...expected].sort());
      }
    }
  });

  it('sổ của máy này (chưa có tổ chức): không có mục của thanh dưới, không có nhóm rỗng', () => {
    const groups = moreGroups({ orgType: null, permissions: [] });
    expect(ids(groups)).not.toContain('dashboard');
    expect(ids(groups)).not.toContain('receipts');
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });
});
