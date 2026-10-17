/**
 * Ai thấy mục nào — theo mô hình ba vai trò (Thumua365_BE docs/FRONTEND.md §5.3–5.4, §6).
 *
 * - Vỏ giao diện theo `organization.type`: nông dân không có sổ (`hasBook`).
 * - Ẩn/hiện theo `membership.permissions`, KHÔNG đoán theo tên vai trò.
 * - Chưa có tổ chức (sổ của máy này, chưa cấu hình máy chủ, offline chưa tải `/v1/me`):
 *   không chặn gì — đúng như trước khi có tài khoản.
 *
 * Server vẫn luôn kiểm lại; ẩn ở đây chỉ để không bày nút bấm vào là lỗi.
 */

import { hasBook, type OrgType, type Permission } from '@mambo/contracts';

export interface Access {
  readonly orgType: OrgType | null;
  readonly permissions: readonly Permission[];
}

export interface Gate {
  /** Cần sổ offline (vựa, doanh nghiệp). */
  readonly book?: true;
  /** Cần tổ chức trên máy chủ (đơn, thông báo, kết nối) — sổ của máy này không có. */
  readonly org?: true;
  /** Chỉ vỏ Doanh nghiệp (chi nhánh, báo cáo tổng). */
  readonly enterprise?: true;
  readonly permission?: Permission;
}

export const allows = (access: Access, gate: Gate | undefined): boolean => {
  if (!gate) return true;
  if (!access.orgType) return !gate.org;
  if (gate.book && !hasBook(access.orgType)) return false;
  if (gate.enterprise && access.orgType !== 'enterprise') return false;
  if (gate.permission && !access.permissions.includes(gate.permission)) return false;
  return true;
};

/** Có quyền `permission` không. Chưa có tổ chức thì có (sổ của máy này). */
export const can = (access: Access, permission: Permission): boolean => allows(access, { permission });

export const isFarmer = (access: Access): boolean => access.orgType === 'farmer';
