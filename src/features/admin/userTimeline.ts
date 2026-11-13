/**
 * Nhật ký một tài khoản ở trang quản trị (API 0.34.0): đặt tên từng dòng, gộp theo ngày giờ Việt Nam, đếm theo nhóm.
 * Máy chủ trả mới nhất trước — ở đây giữ nguyên thứ tự đó.
 */

import type { AdminUserEvent, AdminUserEventKind, MemberRole, OrgType } from '@mambo/contracts';
import { auditActionText, auditDetail } from '@/features/org/AuditPage';
import { roleText } from '@/features/shared/roleText';
import { L } from '@/i18n/labels';
import { actionText, reasonText } from './adminText';

const VN_TZ = 'Asia/Ho_Chi_Minh';
const DAY_MS = 86_400_000;

export type TimelineFilter = 'all' | AdminUserEventKind;

/** Thứ tự nút lọc: việc hay xem nhất trước. */
export const KINDS: readonly AdminUserEventKind[] = ['work', 'organization', 'account', 'admin'];

export const KIND_TEXT: Readonly<Record<AdminUserEventKind, string>> = {
  work: L.adminUserKindWork,
  organization: L.adminUserKindOrg,
  account: L.adminUserKindAccount,
  admin: L.adminUserKindAdmin,
};

/** Ngày theo giờ Việt Nam, dạng `2026-11-13` — khoá để gộp. */
export const vnDayKey = (iso: string): string => new Date(iso).toLocaleDateString('en-CA', { timeZone: VN_TZ });

/** "08:05" theo giờ Việt Nam. */
export const vnTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: VN_TZ });

/** "Hôm nay · 13/11/2026", "Hôm qua · 12/11/2026", "Thứ Hai, 10/11/2026". */
export const dayHeading = (key: string, now: Date = new Date()): string => {
  const noon = new Date(`${key}T12:00:00+07:00`);
  const date = noon.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: VN_TZ });
  if (key === vnDayKey(now.toISOString())) return `${L.adminUserToday} · ${date}`;
  if (key === vnDayKey(new Date(now.getTime() - DAY_MS).toISOString())) return `${L.adminUserYesterday} · ${date}`;
  const weekday = noon.toLocaleDateString('vi-VN', { weekday: 'long', timeZone: VN_TZ });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date}`;
};

export interface DayGroup {
  readonly key: string;
  readonly events: readonly AdminUserEvent[];
}

/** Gộp các dòng liền nhau cùng ngày (đầu vào đã mới trước). */
export const groupByDay = (events: readonly AdminUserEvent[]): DayGroup[] => {
  const groups: { key: string; events: AdminUserEvent[] }[] = [];
  for (const e of events) {
    const key = vnDayKey(e.at);
    const last = groups.at(-1);
    if (last?.key === key) last.events.push(e);
    else groups.push({ key, events: [e] });
  }
  return groups;
};

export const countByKind = (events: readonly AdminUserEvent[]): Readonly<Record<AdminUserEventKind, number>> => {
  const out: Record<AdminUserEventKind, number> = { work: 0, organization: 0, account: 0, admin: 0 };
  for (const e of events) out[e.kind] += 1;
  return out;
};

export const filterEvents = (events: readonly AdminUserEvent[], kind: TimelineFilter, orgId: string): AdminUserEvent[] =>
  events.filter((e) => (kind === 'all' || e.kind === kind) && (!orgId || e.organization?.id === orgId));

const fields = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const count = (v: unknown): number => (typeof v === 'number' ? v : 0);

const role = (type: OrgType | undefined, raw: unknown): string | null =>
  type && (raw === 'owner' || raw === 'manager' || raw === 'staff') ? roleText(type, raw as MemberRole) : null;

/** Câu chính của một dòng. Việc lạ (API mới hơn) hiện nguyên mã. */
export const eventTitle = (e: AdminUserEvent): string => {
  const after = fields(e.after);
  switch (e.action) {
    case 'account.created':
      return L.adminEvAccountCreated;
    case 'membership.joined': {
      const r = role(e.organization?.type, after.role);
      return r ? `${L.adminEvJoined} · ${L.adminEvAsRole} ${r}` : L.adminEvJoined;
    }
    case 'work.day': {
      const parts = [
        count(after.receipts) > 0 ? `${L.adminEvMade} ${count(after.receipts)} ${L.adminEvReceipts}` : null,
        count(after.payments) > 0 ? `${L.adminEvRecorded} ${count(after.payments)} ${L.adminEvPayments}` : null,
      ].filter((p): p is string => p !== null);
      const text = parts.join(' · ');
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
    default:
      return e.kind === 'admin' ? actionText(e.action) : auditActionText(e.action);
  }
};

/** Mấy dòng nói rõ việc đó: phiếu / lần trả nào, tên cũ → mới, vai trò mới, ghi chú của người duyệt, ai làm. */
export const eventLines = (e: AdminUserEvent): string[] => {
  const before = fields(e.before);
  const after = fields(e.after);
  const lines: string[] = [];
  if (e.kind === 'admin') {
    if (typeof after.reason === 'string') lines.push(`${L.adminEvNote}: ${reasonText(after.reason)}`);
    if (e.actor) lines.push(`${L.adminEvApprovedBy}: ${e.actor}`);
    return lines;
  }
  lines.push(...auditDetail(e));
  if (e.action === 'organization.updated' && typeof before.name === 'string' && typeof after.name === 'string') {
    lines.push(`${L.adminEvRename}: "${before.name}" → "${after.name}"`);
  }
  if (e.action === 'member.role_changed' || e.action === 'member.added') {
    const r = role(e.organization?.type, after.role);
    if (r) lines.push(`${L.adminColRole}: ${r}`);
  }
  if (e.actor) lines.push(`${L.adminEvBy} ${e.actor} ${L.adminEvDid}`);
  return lines;
};
