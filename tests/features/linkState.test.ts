import type { LinkSummary } from '@mambo/contracts';
import { describe, expect, it } from 'vitest';
import { linkStateOf } from '@/features/partners/linkState';

const NOW = Date.parse('2026-10-14T00:00:00Z');
const PARTNER = '11111111-1111-4111-8111-111111111111';

const link = (overrides: Partial<LinkSummary>): LinkSummary => ({
  id: crypto.randomUUID(),
  side: 'owner',
  status: 'pending',
  partnerKind: 'supplier',
  partner: { id: PARTNER, name: 'Cô Mai' },
  counterpart: null,
  invitedPhone: null,
  inviteCode: null,
  createdAt: '2026-10-01T00:00:00Z',
  decidedAt: null,
  ...overrides,
});

describe('linkStateOf — ô Kết nối của danh bạ', () => {
  it('chưa mời → none; mã còn hạn → pending; mã hết hạn → none (lấy mã mới)', () => {
    expect(linkStateOf([], PARTNER, NOW)).toEqual({ kind: 'none' });
    const code = { code: 'K7M2QX9P', expiresAt: '2026-10-20T00:00:00Z' };
    expect(linkStateOf([link({ inviteCode: code })], PARTNER, NOW)).toEqual({ kind: 'pending', code });
    expect(linkStateOf([link({ inviteCode: { ...code, expiresAt: '2026-10-13T00:00:00Z' } })], PARTNER, NOW)).toEqual({ kind: 'none' });
  });

  it('đã kết nối thắng mọi lời mời khác; bỏ qua kết nối đã huỷ, phía bên kia, dòng danh bạ khác', () => {
    const active = link({ status: 'active', counterpart: { id: crypto.randomUUID(), type: 'farmer', name: 'Hộ cô Mai' } });
    expect(linkStateOf([link({}), active], PARTNER, NOW)).toEqual({ kind: 'linked', name: 'Hộ cô Mai' });
    const ignored = [
      link({ status: 'revoked', inviteCode: { code: 'AAAAAAAA', expiresAt: '2026-10-20T00:00:00Z' } }),
      link({ side: 'linked', status: 'active' }),
      link({ partner: { id: crypto.randomUUID(), name: 'Khác' }, status: 'active' }),
    ];
    expect(linkStateOf(ignored, PARTNER, NOW)).toEqual({ kind: 'none' });
  });
});
