// @vitest-environment jsdom
/**
 * Tab "Người dùng" (API 0.34.0): mở ra là thấy mọi tài khoản, "Xem thêm" đi tiếp bằng `cursor` và nối vào cuối; bấm
 * một dòng → chi tiết với nhật ký gộp theo ngày, lọc theo nhóm. Và các hàm đặt tên / gộp ngày của nhật ký.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminUserDetail, AdminUserEvent, AdminUserRow, AdminUsers, AdminUsersQuery } from '@mambo/contracts';
import { UsersTab } from '@/features/admin/UsersTab';
import { countByKind, dayHeading, eventLines, eventTitle, filterEvents, groupByDay, vnDayKey, vnTime } from '@/features/admin/userTimeline';
import { L } from '@/i18n/labels';

const fetchUsers = vi.fn<(query: AdminUsersQuery) => Promise<AdminUsers>>();
const firstPage = vi.hoisted(() => ({ current: null as unknown, detail: null as unknown, requests: [] as unknown[] }));

vi.mock('@/data/hooks/useAdmin', async (original) => ({
  ...(await original<typeof import('@/data/hooks/useAdmin')>()),
  // Trang đầu (request là object) và chi tiết (request là id) — trả dữ liệu của ca thử, không chạm mạng.
  useAdminRequest: (request: unknown) => {
    if (request !== null) firstPage.requests.push(request);
    const data = typeof request === 'string' ? firstPage.detail : firstPage.current;
    return { data, loading: false, error: null };
  },
  fetchUsers: (query: AdminUsersQuery) => fetchUsers(query),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const person = (n: number): AdminUserRow => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name: `Người ${n}`,
  username: null,
  phone: `+8490500${String(n).padStart(4, '0')}`,
  hasVerifiedRecoveryEmail: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  memberships: [],
});

const VUA = { id: '11111111-1111-4111-8111-111111111111', name: 'Vựa Tư Hùng', type: 'trader' as const };

const ev = (over: Partial<AdminUserEvent>): AdminUserEvent => ({
  at: '2026-11-12T01:00:00.000Z',
  kind: 'work',
  action: 'work.day',
  organization: VUA,
  actor: null,
  before: null,
  after: null,
  ...over,
});

const TIMELINE: AdminUserEvent[] = [
  ev({ at: '2026-11-12T02:00:00.000Z', kind: 'admin', action: 'reset-password', organization: null, actor: 'Linh (admin)', after: { reason: 'Khách gọi' } }),
  ev({ at: '2026-11-12T01:00:00.000Z', kind: 'organization', action: 'member.role_changed', actor: 'Cô Mai', after: { role: 'manager' } }),
  ev({ at: '2026-11-11T01:00:00.000Z', action: 'receipt.deleted', before: { date: '2026-11-10T00:00:00.000Z', total: 1_000_000 } }),
  ev({ at: '2026-11-10T05:00:00.000Z', after: { receipts: 2, payments: 1 } }),
  ev({ at: '2026-11-01T00:05:00.000Z', kind: 'organization', action: 'membership.joined', after: { role: 'owner' } }),
  ev({ at: '2026-11-01T00:00:00.000Z', kind: 'account', action: 'account.created', organization: null }),
];

const DETAIL: AdminUserDetail = {
  ...person(1),
  memberships: [
    {
      organization: VUA,
      role: 'owner',
      status: 'active',
      branch: null,
      joinedAt: '2026-11-01T00:05:00.000Z',
      receipts: 2,
      payments: 1,
      lastActivityAt: '2026-11-10T05:00:00.000Z',
    },
  ],
  timeline: TIMELINE,
  timelineTruncated: false,
};

let root: Root;
let host: HTMLDivElement;

const click = async (el: Element | null | undefined) => {
  if (!(el instanceof HTMLElement)) throw new Error('Không thấy nút');
  await act(async () => el.click());
};
const button = (text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.startsWith(text));

beforeEach(() => {
  fetchUsers.mockReset();
  firstPage.requests.length = 0;
  firstPage.current = { rows: [person(1), person(2)], cursor: 'c1' };
  firstPage.detail = DETAIL;
  vi.stubGlobal('scrollTo', () => undefined);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(UsersTab, { you: { id: 'admin-id', name: 'Admin' } })));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('tab Người dùng', () => {
  it('mở ra là tải mọi tài khoản (không q); "Xem thêm" gọi với cursor và nối vào cuối; hết trang thì báo đã hết', async () => {
    expect(firstPage.requests[0]).toEqual({});
    expect(host.textContent).toContain('Người 1');
    expect(host.textContent).toContain(L.adminUsersAll);

    fetchUsers.mockResolvedValueOnce({ rows: [person(3)], cursor: null });
    await click(button(L.adminUsersMore));
    expect(fetchUsers).toHaveBeenCalledWith({ cursor: 'c1' });
    expect(host.textContent).toContain('Người 3');
    expect(host.textContent).toContain(L.adminUsersEnd);
    expect(button(L.adminUsersMore)).toBeUndefined();
  });

  it('bấm một dòng → chi tiết: số phiếu / lần trả, tổ chức, nhật ký gộp theo ngày; lọc nhóm; về danh sách giữ trang đã tải', async () => {
    const row = [...host.querySelectorAll('tr, [role="button"], li, button')].find((el) => el.textContent?.includes('Người 2'));
    await click(row);
    expect(firstPage.requests.at(-1)).toBe(person(2).id);
    expect(host.textContent).toContain(L.adminUserTimeline);
    expect(host.textContent).toContain('Vựa Tư Hùng');
    expect(host.textContent).toContain('Lập 2 phiếu · ghi 1 lần trả');
    expect(host.textContent).toContain(`${L.adminEvBy} Cô Mai ${L.adminEvDid}`);
    expect(host.querySelectorAll('h3')).toHaveLength(4); // 12/11, 11/11, 10/11, 01/11

    await click(button(L.adminUserKindAdmin));
    expect(host.textContent).toContain('Khách gọi');
    expect(host.textContent).not.toContain('Lập 2 phiếu');

    await click(button(L.adminBackToList));
    expect(host.textContent).toContain('Người 1');
  });
});

describe('nhật ký tài khoản', () => {
  it('ngày, giờ theo giờ Việt Nam; tiêu đề ngày Hôm nay / Hôm qua / thứ', () => {
    expect(vnDayKey('2026-11-12T18:30:00.000Z')).toBe('2026-11-13');
    expect(vnTime('2026-11-12T18:30:00.000Z')).toBe('01:30');
    const now = new Date('2026-11-13T03:00:00.000Z');
    expect(dayHeading('2026-11-13', now)).toBe(`${L.adminUserToday} · 13/11/2026`);
    expect(dayHeading('2026-11-12', now)).toBe(`${L.adminUserYesterday} · 12/11/2026`);
    expect(dayHeading('2026-11-10', now)).toBe('Thứ Ba, 10/11/2026');
  });

  it('gộp theo ngày giữ thứ tự mới trước; đếm và lọc theo nhóm, theo tổ chức', () => {
    expect(groupByDay(TIMELINE).map((g) => [g.key, g.events.length])).toEqual([
      ['2026-11-12', 2],
      ['2026-11-11', 1],
      ['2026-11-10', 1],
      ['2026-11-01', 2],
    ]);
    expect(countByKind(TIMELINE)).toEqual({ work: 2, organization: 2, account: 1, admin: 1 });
    expect(filterEvents(TIMELINE, 'work', '').map((e) => e.action)).toEqual(['receipt.deleted', 'work.day']);
    expect(filterEvents(TIMELINE, 'all', VUA.id)).toHaveLength(4);
  });

  it('tên dòng và dòng chi tiết', () => {
    expect(TIMELINE.map(eventTitle)).toEqual([
      L.adminActReset,
      L.auditActMemberRoleChanged,
      L.auditActReceiptDeleted,
      'Lập 2 phiếu · ghi 1 lần trả',
      `${L.adminEvJoined} · ${L.adminEvAsRole} ${L.roleOwner}`,
      L.adminEvAccountCreated,
    ]);
    expect(eventLines(TIMELINE[0] as AdminUserEvent)).toEqual([`${L.adminEvNote}: Khách gọi`, `${L.adminEvApprovedBy}: Linh (admin)`]);
    expect(eventLines(TIMELINE[1] as AdminUserEvent)).toEqual([`${L.adminColRole}: ${L.roleManager}`, `${L.adminEvBy} Cô Mai ${L.adminEvDid}`]);
    expect(eventTitle(ev({ after: { receipts: 0, payments: 3 } }))).toBe('Ghi 3 lần trả');
    expect(eventTitle(ev({ kind: 'organization', action: 'something.new' }))).toBe('something.new');
  });
});
