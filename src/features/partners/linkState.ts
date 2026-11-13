import type { LinkInviteCode, LinkSummary } from '@mambo/contracts';

export type LinkState =
  | { readonly kind: 'linked'; readonly name: string }
  | { readonly kind: 'pending'; readonly code: LinkInviteCode }
  | { readonly kind: 'none' };

/**
 * Hồ sơ đang kết nối (hay đã phát mã mời) với tài khoản bên kia. Không bao giờ được gộp tự động theo tên (B3):
 * bên kia thấy mọi phiếu ghi cho hồ sơ này, gộp nhầm là lộ phiếu của người khác.
 */
export const linkedPartnerIds = (links: readonly LinkSummary[]): ReadonlySet<string> =>
  new Set(links.filter((l) => l.side === 'owner' && (l.status === 'active' || l.status === 'pending')).map((l) => l.partner.id));

/**
 * Một dòng danh bạ đang ở đâu trên đường kết nối, nhìn từ phía sổ. Mã đã hết hạn coi như chưa có:
 * bấm "Lấy mã" thì máy chủ cấp mã mới cho đúng lời mời cũ.
 */
export const linkStateOf = (links: readonly LinkSummary[], partnerId: string, now = Date.now()): LinkState => {
  const mine = links.filter((l) => l.side === 'owner' && l.partner.id === partnerId && l.status !== 'revoked');
  const active = mine.find((l) => l.status === 'active');
  if (active) return { kind: 'linked', name: active.counterpart?.name ?? '' };
  const code = mine.find((l) => l.status === 'pending')?.inviteCode;
  if (code && Date.parse(code.expiresAt) > now) return { kind: 'pending', code };
  return { kind: 'none' };
};
