/**
 * Nhân viên, chi nhánh, báo cáo tổng (BE7 — Thumua365_BE docs/FRONTEND.md §5.9). Cần mạng.
 */

import type {
  MemberActivityReport,
  OrgBranch,
  OrgBranchCreateInput,
  OrgBranchesList,
  OrgBranchPatch,
  OrgMember,
  OrgMemberCreateInput,
  OrgMemberPatch,
  ReportSummary,
} from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { L } from '@/i18n/labels';
import { wipeOrgFromDevice } from './account';
import { api } from './client';
import { linkErrorMessage } from './links';
import { track } from './track';

export const listMembers = async (): Promise<readonly OrgMember[]> => (await api.org.members.list()).members;
export const createMember = async (input: OrgMemberCreateInput): Promise<OrgMember> => {
  const member = await api.org.members.create(input);
  track('member_invited', { role: input.role });
  return member;
};
export const updateMember = (id: string, patch: OrgMemberPatch): Promise<OrgMember> => api.org.members.update(id, patch);
export const removeMember = (id: string): Promise<OrgMember> => api.org.members.remove(id);

/** Chỉ chủ (máy chủ kiểm). */
export const renameOrg = async (name: string): Promise<void> => {
  await api.org.update({ name });
};

/** Người không phải chủ tự rời tổ chức đang làm việc — mất quyền ngay; dọn sổ của tổ chức đó khỏi máy. */
export const leaveOrg = async (orgId: string): Promise<void> => {
  await api.org.leave();
  await wipeOrgFromDevice(orgId);
};

export const listBranches = (): Promise<OrgBranchesList> => api.org.branches.list();
export const createBranch = (input: OrgBranchCreateInput): Promise<OrgBranch> => api.org.branches.create(input);
export const updateBranch = (id: string, patch: OrgBranchPatch): Promise<OrgBranch> => api.org.branches.update(id, patch);

export const reportSummary = (from: string, to: string, branchId?: string): Promise<ReportSummary> =>
  api.reports.summary({ from, to, branchId });

export const memberActivity = (from: string, to: string): Promise<MemberActivityReport> => api.reports.members({ from, to });

/** Câu báo lỗi cho màn Nhân viên / Chi nhánh — rẽ theo `details.reason`, rồi theo `code`. */
export const orgErrorMessage = (err: unknown): string => {
  if (err instanceof ApiError) {
    const reason = err.details?.reason;
    if (reason === 'ACCOUNT_EXISTS') return L.memberAccountExists;
    if (reason === 'ALREADY_MEMBER') return L.memberAlreadyIn;
    if (err.code === 'BRANCH_LIMIT') return `${L.branchLimit} ${String(err.details?.limit ?? '')}`.trim();
    if (err.code === 'VALIDATION_FAILED') {
      // `fields` = { tên trường: câu lỗi } — câu để hiện cho người dùng. Không có `fields`: lưu trữ chi nhánh còn người gắn.
      const first = Object.values((err.details?.fields as Record<string, unknown> | undefined) ?? {})[0];
      return typeof first === 'string' ? first : L.branchHasMembers;
    }
  }
  return linkErrorMessage(err);
};

/** Tháng hiện tại theo giờ Việt Nam, dạng `2026-10`. */
export const thisMonth = (): string => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 7);

/** Hôm nay theo giờ Việt Nam: đầu ngày và đầu ngày mai (`to` không gồm). */
export const todayRange = (now = Date.now()): { from: string; to: string } => {
  const day = new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
  const next = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return { from: `${day}T00:00:00+07:00`, to: `${next}T00:00:00+07:00` };
};

/** `2026-10` → đầu tháng và đầu tháng sau theo giờ Việt Nam (`to` không gồm). */
export const monthRange = (month: string): { from: string; to: string } => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, '0');
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  return { from: `${y}-${pad(m)}-01T00:00:00+07:00`, to: `${next}-01T00:00:00+07:00` };
};
