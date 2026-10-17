/**
 * Nhân viên, chi nhánh, báo cáo tổng — cửa cho màn hình. Hỏi lại khi đổi tổ chức.
 */

import type { MemberActivityReport, OrgBranchesList, OrgMember, ReportSummary } from '@mambo/contracts';
import { listBranches, listMembers, memberActivity, reportSummary } from '../org';
import { useStore } from '../useStore';
import { useLoad, type Loaded } from './useLinked';

export {
  createBranch,
  createMember,
  monthRange,
  orgErrorMessage,
  removeMember,
  renameOrg,
  thisMonth,
  todayRange,
  updateBranch,
  updateMember,
} from '../org';

export const useMembers = (): Loaded<readonly OrgMember[]> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId ? listMembers : null, currentOrgId ?? '');
};

/** `enabled` = có `branch:manage`; người khác không gọi (403). */
export const useBranches = (enabled = true): Loaded<OrgBranchesList> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId && enabled ? listBranches : null, currentOrgId ?? '');
};

export const useReportSummary = (from: string, to: string, branchId?: string): Loaded<ReportSummary> => {
  const { currentOrgId } = useStore();
  return useLoad(
    currentOrgId ? () => reportSummary(from, to, branchId) : null,
    `${currentOrgId ?? ''}:${from}:${to}:${branchId ?? ''}`,
  );
};

/** Việc của từng người trong khoảng — chỉ chủ (`staff:manage`); `enabled` = có quyền đó. */
export const useMemberActivity = (from: string, to: string, enabled = true): Loaded<MemberActivityReport> => {
  const { currentOrgId } = useStore();
  return useLoad(currentOrgId && enabled ? () => memberActivity(from, to) : null, `${currentOrgId ?? ''}:${from}:${to}`);
};
