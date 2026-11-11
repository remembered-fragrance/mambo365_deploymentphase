/**
 * Quản trị: mở gói bằng tay, đặt lại mật khẩu cho khách, giao dịch mua gói, phễu đo lường (`/v1/admin/*`).
 *
 * Quyền do MÁY CHỦ quyết (`ADMIN_USER_IDS` trên Render). App không giữ danh sách quản trị nào, và `/v1/me` không
 * nói ai là quản trị — trang hỏi phễu trước (lời gọi chỉ đọc); máy chủ từ chối thì `adminDeniedMessage` nói vì sao.
 *
 * Các route này có trong `@mambo/contracts` nhưng `@mambo/sdk` mới chỉ có `api.admin.payments` (0.31.0), nên `call`
 * dưới đây gọi tay theo đúng cách của SDK: cùng token, lỗi là `ApiError`, phản hồi kiểm bằng schema của hợp đồng.
 * shortcut: chép lõi `call` của SDK, đổi sang `api.admin.*` khi SDK có đủ.
 */

import {
  AdminActivatePlanInput,
  AdminResetPasswordInput,
  ErrorBody,
  routes,
  type AdminActivatePlanResult,
  type AdminFunnel,
  type AdminPayments,
  type PlanCode,
  type RouteResponse,
} from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { z } from 'zod';
import { L } from '@/i18n/labels';
import { accessToken, apiBaseUrl } from './client';

type AdminRoute = 'adminActivatePlan' | 'adminResetPassword' | 'adminFunnel' | 'adminPayments';

const call = async <N extends AdminRoute>(
  name: N,
  body?: unknown,
  query?: Readonly<Record<string, string>>,
): Promise<RouteResponse<N>> => {
  const route = routes[name];
  const token = await accessToken();
  if (!token) throw new ApiError('UNAUTHENTICATED', 401, 'Chưa đăng nhập');

  const res = await fetch(`${apiBaseUrl}${route.path}${query ? `?${new URLSearchParams(query).toString()}` : ''}`, {
    method: route.method,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const requestId = res.headers.get('x-request-id') ?? undefined;
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = ErrorBody.safeParse(json).data?.error;
    throw error
      ? new ApiError(error.code, res.status, error.message, error.requestId, error.details)
      : new ApiError('INTERNAL', res.status, `HTTP ${res.status}`, requestId);
  }
  const parsed = route.response.safeParse(json);
  if (!parsed.success) {
    throw new ApiError('CONTRACT_MISMATCH', res.status, `Phản hồi của ${route.path} không khớp hợp đồng`, requestId);
  }
  return parsed.data as RouteResponse<N>;
};

// ─── Form → đầu vào của hợp đồng ─────────────────────────────────────────────

/** Đầu vào đã qua schema, hoặc tên các ô sai để màn hình tô đỏ. */
export type Checked<I, D> = { readonly input: I } | { readonly invalid: readonly (keyof D)[] };

const invalidFields = <D>(error: z.ZodError, rename: (field: string) => string = (f) => f): (keyof D)[] =>
  [...new Set(error.issues.map((issue) => rename(String(issue.path[0]))))] as (keyof D)[];

export interface ActivateDraft {
  /** Số điện thoại của CHỦ, hoặc id tổ chức (UUID) — máy chủ nhận đúng một trong hai. */
  readonly target: string;
  /** `''` = giữ gói đang có; doanh nghiệp không có mã gói nên cũng để trống. */
  readonly plan: PlanCode | '';
  readonly months: number;
  /** `null` = giữ nguyên. Chỉ gửi khi chọn gói Vựa — gói khác máy chủ từ chối. */
  readonly extraStaff: number | null;
  readonly amount: number;
  readonly bankTxId: string;
  readonly approvedBy: string;
  readonly reason: string;
}

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export const activateInput = (draft: ActivateDraft): Checked<AdminActivatePlanInput, ActivateDraft> => {
  const target = draft.target.trim();
  const parsed = AdminActivatePlanInput.safeParse({
    ...(UUID.test(target) ? { organizationId: target } : { ownerPhone: target }),
    months: draft.months,
    amount: draft.amount,
    bankTxId: draft.bankTxId,
    approvedBy: draft.approvedBy,
    // Lý do rỗng mà vẫn gửi thì nhật ký ghi dòng trống, mất câu mặc định "số tháng · số tiền · mã giao dịch".
    ...(draft.reason.trim() ? { reason: draft.reason } : {}),
    ...(draft.plan ? { plan: draft.plan } : {}),
    ...(draft.plan === 'vua' && draft.extraStaff !== null ? { extraStaff: draft.extraStaff } : {}),
  });
  if (parsed.success) return { input: parsed.data };
  return { invalid: invalidFields(parsed.error, (f) => (f === 'organizationId' || f === 'ownerPhone' ? 'target' : f)) };
};

export interface ResetDraft {
  readonly phone: string;
  readonly newPassword: string;
  readonly approvedBy: string;
  readonly reason: string;
}

export const resetInput = (draft: ResetDraft): Checked<AdminResetPasswordInput, ResetDraft> => {
  const parsed = AdminResetPasswordInput.safeParse({
    phone: draft.phone,
    newPassword: draft.newPassword,
    approvedBy: draft.approvedBy,
    ...(draft.reason.trim() ? { reason: draft.reason } : {}),
  });
  return parsed.success ? { input: parsed.data } : { invalid: invalidFields(parsed.error) };
};

// ─── Lời gọi ─────────────────────────────────────────────────────────────────

/** Gọi lại cùng mã giao dịch thì an toàn: máy chủ trả `alreadyProcessed`, không cộng thêm kỳ nào. */
export const activatePlan = (input: AdminActivatePlanInput): Promise<AdminActivatePlanResult> =>
  call('adminActivatePlan', input);

/** Máy chủ chỉ nhận người CHƯA có email khôi phục đã xác nhận — người có rồi tự đặt lại qua email. */
export const resetPassword = async (input: AdminResetPasswordInput): Promise<void> => {
  await call('adminResetPassword', input);
};

const DAY_MS = 86_400_000;

const lastDays = (days: number, now: Date) => ({
  from: new Date(now.getTime() - days * DAY_MS).toISOString(),
  to: now.toISOString(),
});

/** Phễu của `days` ngày gần nhất, tính tới `now`. */
export const fetchFunnel = (days: number, now: Date = new Date()): Promise<AdminFunnel> =>
  call('adminFunnel', undefined, lastDays(days, now));

/**
 * Giao dịch mua gói của `days` ngày gần nhất, mới nhất trước (tối đa `ADMIN_PAYMENTS_MAX` dòng).
 * 🔴 Mỗi lần gọi máy chủ ghi một dòng `admin_access_log` — chỉ gọi khi người quản trị bấm xem.
 */
export const fetchPayments = (days: number, now: Date = new Date()): Promise<AdminPayments> =>
  call('adminPayments', undefined, lastDays(days, now));

// ─── Lỗi ─────────────────────────────────────────────────────────────────────

/** Máy chủ không cho vào trang quản trị (401 / 403 / 404) → câu nói rõ vì sao. Lỗi khác (mạng, 5xx) → `null`. */
export const adminDeniedMessage = (err: unknown): string | null => {
  if (!(err instanceof ApiError)) return null;
  if (err.status === 401) return L.adminSignedOut;
  if (err.status === 403) return L.adminForbidden;
  if (err.status === 404) return L.adminUnavailable;
  return null;
};

/** Câu báo của máy chủ hiện NGUYÊN VĂN ("Không có tài khoản với số này"…); lỗi 5xx kèm mã yêu cầu để tra log. */
export const adminErrorMessage = (err: unknown): string => {
  if (err instanceof TypeError) return L.adminOffline;
  if (err instanceof ApiError && err.status >= 500 && err.requestId) return `${err.message} (id: ${err.requestId})`;
  return err instanceof Error ? err.message : L.errorTitle;
};

const OwnedOrganizations = z.array(z.object({ id: z.string(), name: z.string() }));

/** "Số này chủ nhiều tổ chức — gửi organizationId": máy chủ kèm danh sách để người quản trị chọn đúng tổ chức. */
export const ownedOrganizations = (err: unknown): readonly { readonly id: string; readonly name: string }[] =>
  err instanceof ApiError ? (OwnedOrganizations.safeParse(err.details?.organizations).data ?? []) : [];
